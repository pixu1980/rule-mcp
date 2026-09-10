

/** Stdio and serve hygiene: a server dies with its client, its socket, its signal. */

import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { connect, createServer } from "node:net";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { alive, bin, reap, root, until, within } from "./_hygiene.fixture.mjs";
test("a stdio server exits when its client is killed", async (t) => {
  const handoff = join(mkdtempSync(join(tmpdir(), "rule-orphan-")), "pid");
  let serverPid = null;
  t.after(() => {
    if (serverPid) {
      reap(serverPid);
    }
    rmSync(join(handoff, ".."), { recursive: true, force: true });
  });

  // Stand in for an MCP client: spawn the server over pipes, then die without
  // closing anything, the way a killed editor or agent does.
  const client = spawn(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { spawn } from "node:child_process";
       import { writeFileSync } from "node:fs";
       const child = spawn(process.execPath, [${JSON.stringify(bin)}, "serve"], { stdio: ["pipe", "pipe", "pipe"] });
       child.stdout.resume();
       child.stderr.resume();
       writeFileSync(${JSON.stringify(handoff)}, String(child.pid));
       setInterval(() => {}, 1000);`,
    ],
    { cwd: root, stdio: "ignore", detached: true },
  );
  t.after(() => reap(client.pid));

  assert.equal(await until(() => existsSync(handoff)), true, "the client never reported the server pid");
  serverPid = Number(readFileSync(handoff, "utf8").trim());
  assert.equal(await until(() => alive(serverPid)), true, "the server never started");

  reap(client.pid);
  assert.equal(await until(() => !alive(serverPid), 20_000), true, "the stdio server outlived its client - this is the orphan that spins at 100% CPU");
});

test("a stdio server exits when its peer socket loses its other end", async (t) => {
  // Not the same as a closed pipe. The orphans found in the wild had fd 0, 1
  // and 2 on unix socketpairs with no peer - a client that was killed rather
  // than closed - and reads on those error rather than reporting EOF.
  const socketDir = mkdtempSync(join(tmpdir(), "rule-peerless-"));
  let serverPid = null;
  t.after(() => {
    if (serverPid) {
      reap(serverPid);
    }
    rmSync(socketDir, { recursive: true, force: true });
  });

  const socketPath = join(socketDir, "s");
  let clientSide = null;
  const serverSide = await new Promise((resolve, reject) => {
    const listener = createServer((connection) => {
      listener.close();
      resolve(connection);
    });
    listener.once("error", reject);
    listener.listen(socketPath, () => {
      clientSide = connect(socketPath);
      clientSide.once("error", reject);
    });
  });
  await until(() => clientSide?.readyState === "open");

  const fd = serverSide._handle?.fd;
  assert.ok(fd > 0, "could not get a socket descriptor to hand to the server");
  const server = spawn(process.execPath, [bin, "serve"], { cwd: root, stdio: [fd, fd, fd] });
  serverPid = server.pid;
  await new Promise((resolve) => setTimeout(resolve, 1500));
  assert.equal(alive(serverPid), true, "the server never started");

  // Both ends in this process go away: the descriptor the server holds now has
  // no peer at all.
  clientSide.destroy();
  serverSide.destroy();

  const exit = new Promise((resolve) => server.once("exit", () => resolve(true)));
  assert.equal(await within(exit, 20_000, false), true, "the server kept running with nothing on the other end of its stdio");
});
