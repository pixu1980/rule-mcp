

/** Shutdown hygiene: an error storm ends the process, a signal ends serve, no timer survives. */

import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bin, reap, reservePort, root, until, within } from "./_hygiene.fixture.mjs";
import { fileURLToPath } from "node:url";

// Server code resolves `@src/*` through a hook (ADR 079); a spawned
// process loads it too, so it registers the hook as every entry point does.
const ALIAS_HOOK = fileURLToPath(new URL("../../../../scripts/alias-hook.mjs", import.meta.url));
test("an error storm ends the process instead of being ridden out", async (t) => {
  // The shape found on a real machine, read off a `sample` of the stack: a
  // callback that throws on every check phase of the event loop, an
  // uncaughtException handler that logs and returns, and V8 formatting a fresh
  // stack trace each time round. 100% of a core, indefinitely.
  const storm = spawn(
    process.execPath,
    [
      "--import",
      ALIAS_HOOK,
      "--input-type=module",
      "-e",
      `const { installProcessErrorHandlers } = await import(${JSON.stringify(join(root, "src", "utils", "index.js"))});
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
    assert.equal(await until(() => stderr.includes("ready (signal handlers installed)"), 15_000), true, `the server never became ready:\n${stderr}`);

    const exit = new Promise((resolve) => child.once("exit", (exitCode, exitSignal) => resolve({ exitCode, exitSignal })));
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
