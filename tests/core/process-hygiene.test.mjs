/**
 * @module test/process-hygiene.test
 *
 * No process outlives the thing that needed it.
 *
 * Three leaks, each observed on a real machine before it was a test:
 *   - `daemon start` never returned, because the parent held the daemon's
 *     stdio pipes open while claiming to have detached from it.
 *   - `daemon stop` deleted the pid file after one SIGTERM, so a process that
 *     ignored the signal became unkillable through the CLI.
 *   - A stdio server whose client was killed kept running - reparented to init,
 *     spinning at 100% CPU on a socket with no peer, holding ~165 MB.
 *
 * Slow by nature: these spawn real processes and wait for them to die.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { connect, createServer } from "node:net";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const bin = join(root, "bin", "rule-mcp.js");

/** A port nobody is listening on. */
function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

/** True while the pid is alive. */
function alive(pid) {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
}

/** Wait until `predicate()` is true, or give up after `timeout` ms. */
async function until(predicate, timeout = 5000, step = 50) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, step));
  }

  return false;
}

/**
 * Resolve to `value` when `promise` has not settled within `ms`.
 *
 * The timer is cleared whichever side wins. A bare `setTimeout` inside a
 * `Promise.race` stays armed once the race is decided, and the event loop
 * waits for it: the six this file used to arm held it open for 19 seconds
 * after the last assertion had already passed.
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {T} value
 * @returns {Promise<T>}
 */
async function within(promise, ms, value) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(value), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** SIGKILL a pid, ignoring the case where it is already gone. */
function reap(pid) {
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    /* already gone */
  }
}

test("daemon start detaches instead of holding the daemon open", async (t) => {
  const stateDir = mkdtempSync(join(tmpdir(), "rule-daemon-detach-"));
  const port = await reservePort();
  let daemonPid = null;
  t.after(() => {
    if (daemonPid) {
      reap(daemonPid);
    }
    rmSync(stateDir, { recursive: true, force: true });
  });

  const starter = spawn(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `const { startDaemonProcess } = await import(${JSON.stringify(join(root, "src", "cli", "daemon.js"))});
       const result = startDaemonProcess({});
       process.stdout.write(JSON.stringify(result));`,
    ],
    {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, RULE_MCP_STATE_DIR: stateDir, RULE_MCP_PORT: String(port) },
    },
  );
  let stdout = "";
  starter.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  const exited = await within(new Promise((resolve) => starter.once("exit", () => resolve(true))), 8000, false);
  if (!exited) {
    reap(starter.pid);
  }
  assert.equal(exited, true, "the process that spawned the daemon never exited");

  daemonPid = JSON.parse(stdout).pid;
  assert.equal(alive(daemonPid), true, "the daemon did not survive its parent");

  // The daemon still logs, even though the parent is not piping for it.
  const logFile = join(stateDir, "daemon.log");
  assert.equal(
    await until(() => existsSync(logFile) && readFileSync(logFile, "utf8").includes("listening")),
    true,
    "the detached daemon wrote no log",
  );
});

test("daemon stop escalates to SIGKILL and only then forgets the pid", async (t) => {
  const stateDir = mkdtempSync(join(tmpdir(), "rule-daemon-stop-"));
  const pidFile = join(stateDir, "daemon.pid");
  t.after(() => rmSync(stateDir, { recursive: true, force: true }));

  // A daemon that ignores SIGTERM. The old stop path left this running forever
  // and removed the only record of its pid. It reports when its handler is
  // installed: signalled any earlier, it would die of the default action and
  // prove nothing.
  const stubborn = spawn(
    process.execPath,
    ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000); console.log('ready')"],
    { stdio: ["ignore", "pipe", "ignore"] },
  );
  t.after(() => reap(stubborn.pid));
  let ready = "";
  stubborn.stdout.on("data", (chunk) => {
    ready += chunk.toString();
  });
  assert.equal(await until(() => ready.includes("ready")), true, "the stubborn daemon never started");
  writeFileSync(pidFile, String(stubborn.pid));

  const previous = process.env.RULE_MCP_STATE_DIR;
  process.env.RULE_MCP_STATE_DIR = stateDir;
  try {
    const { stopDaemonProcess } = await import("../../src/cli/daemon/index.js");
    // The pid is a child of this test process, so it stays in the process table
    // as a zombie until the runtime reaps it. Its exit event is the honest
    // signal that it is dead, which kill(pid, 0) is not.
    const exited = new Promise((resolve) => stubborn.once("exit", (code, signal) => resolve(signal ?? code)));
    const result = await stopDaemonProcess({});
    assert.equal(result.ok, true);
    assert.equal(result.action, "killed", "a daemon that ignores SIGTERM should be reported as killed");
    assert.equal(await within(exited, 3000, null), "SIGKILL", "the daemon that ignored SIGTERM was never killed");
    assert.equal(existsSync(pidFile), false, "the pid file outlived the daemon");
  } finally {
    if (previous === undefined) {
      delete process.env.RULE_MCP_STATE_DIR;
    } else {
      process.env.RULE_MCP_STATE_DIR = previous;
    }
  }
});

test("daemon stop takes the graceful path when the daemon has one", async (t) => {
  const stateDir = mkdtempSync(join(tmpdir(), "rule-daemon-graceful-"));
  const pidFile = join(stateDir, "daemon.pid");
  t.after(() => rmSync(stateDir, { recursive: true, force: true }));

  const polite = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
  t.after(() => reap(polite.pid));
  writeFileSync(pidFile, String(polite.pid));

  const previous = process.env.RULE_MCP_STATE_DIR;
  process.env.RULE_MCP_STATE_DIR = stateDir;
  try {
    const { stopDaemonProcess } = await import("../../src/cli/daemon/index.js");
    const startedAt = Date.now();
    const result = await stopDaemonProcess({});
    assert.equal(result.action, "stopped");
    assert.ok(Date.now() - startedAt < 2000, "SIGTERM was honoured but stop still waited out the grace period");
    assert.equal(existsSync(pidFile), false);
  } finally {
    if (previous === undefined) {
      delete process.env.RULE_MCP_STATE_DIR;
    } else {
      process.env.RULE_MCP_STATE_DIR = previous;
    }
  }
});

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
  assert.equal(
    await until(() => !alive(serverPid), 20_000),
    true,
    "the stdio server outlived its client - this is the orphan that spins at 100% CPU",
  );
});

test("an error storm ends the process instead of being ridden out", async (t) => {
  // The shape found on a real machine, read off a `sample` of the stack: a
  // callback that throws on every check phase of the event loop, an
  // uncaughtException handler that logs and returns, and V8 formatting a fresh
  // stack trace each time round. 100% of a core, indefinitely.
  const storm = spawn(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `const { installProcessErrorHandlers } = await import(${JSON.stringify(join(root, "src", "utils", "sandbox.js"))});
       installProcessErrorHandlers();
       const spin = () => setImmediate(() => { spin(); throw new Error("storm"); });
       spin();`,
    ],
    { cwd: root, stdio: ["ignore", "ignore", "ignore"] },
  );
  t.after(() => reap(storm.pid));

  const exit = new Promise((resolve) => storm.once("exit", (code) => resolve(code)));
  const code = await within(exit, 10_000, "timeout");
  assert.equal(code, 70, "the storm was ridden out instead of ending the process");
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
  assert.equal(
    await within(exit, 20_000, false),
    true,
    "the server kept running with nothing on the other end of its stdio",
  );
});

test("serve shuts down on a signal", async (t) => {
  for (const [signal, code] of [
    ["SIGTERM", 143],
    ["SIGINT", 130],
  ]) {
    const port = await reservePort();
    const stateDir = mkdtempSync(join(tmpdir(), "rule-serve-signal-"));
    const child = spawn(process.execPath, [bin, "serve", "--transport", "http", "--port", String(port)], {
      cwd: root,
      stdio: ["ignore", "ignore", "pipe"],
      env: { ...process.env, RULE_MCP_STATE_DIR: stateDir },
    });
    t.after(() => {
      reap(child.pid);
      rmSync(stateDir, { recursive: true, force: true });
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    // Wait for the readiness marker, not "listening": the socket opens before
    // the signal handlers are installed, and a signal in that window exits
    // through Node's default disposition (deflake, hardening 4.6).
    assert.equal(
      await until(() => stderr.includes("ready (signal handlers installed)"), 15_000),
      true,
      `the server never became ready:\n${stderr}`,
    );

    const exit = new Promise((resolve) =>
      child.once("exit", (exitCode, exitSignal) => resolve({ exitCode, exitSignal })),
    );
    child.kill(signal);
    const raced = await within(exit, 5000, null);
    assert.ok(raced, `${signal} did not stop the server`);
    assert.equal(raced.exitCode, code, `${signal} should exit ${code}, got ${JSON.stringify(raced)}`);
  }
});

test("the suite leaves no timer armed behind it", () => {
  // A process this file spawns is reaped by its own test. A timer is not: the
  // loser of a `Promise.race` stays armed, the event loop waits for it, and
  // this file took 25.5 seconds to run seven tests that finish in 6.2. The
  // runner holds no timer of its own, so anything here is this file's.
  const pending = process.getActiveResourcesInfo().filter((resource) => resource === "Timeout");

  assert.deepEqual(pending, [], "a race has to clear the timer it lost");
});
