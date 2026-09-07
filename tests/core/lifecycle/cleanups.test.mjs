/** Cleanup registration, signals and exits: the lifecycle state machine itself. */
import test from "node:test";
import assert from "node:assert/strict";
import "node:fs";
import "node:os";
import "node:path";
import { spawn } from "node:child_process";
import { alive, lifecycle, signalTarget, until } from "./_lifecycle.fixture.mjs";

test("cleanups run once, last registered first", async () => {
  lifecycle.resetLifecycle();
  const order = [];
  lifecycle.registerCleanup("first", () => order.push("first"));
  lifecycle.registerCleanup("second", () => order.push("second"));

  const results = await lifecycle.runShutdown("test");
  assert.deepEqual(order, ["second", "first"]);
  assert.deepEqual(
    results.map((r) => [r.name, r.ok]),
    [
      ["second", true],
      ["first", true],
    ],
  );

  // A second shutdown is a no-op: cleanups are not run twice.
  await lifecycle.runShutdown("test");
  assert.deepEqual(order, ["second", "first"]);
});

test("a throwing cleanup does not stop the others", async () => {
  lifecycle.resetLifecycle();
  let ran = false;
  lifecycle.registerCleanup("ok", () => {
    ran = true;
  });
  lifecycle.registerCleanup("boom", () => {
    throw new Error("nope");
  });

  const results = await lifecycle.runShutdown("test");
  assert.equal(ran, true);
  assert.equal(results.find((r) => r.name === "boom").ok, false);
});

test("unregister removes a cleanup", async () => {
  lifecycle.resetLifecycle();
  let ran = false;
  const off = lifecycle.registerCleanup("gone", () => {
    ran = true;
  });
  off();
  await lifecycle.runShutdown("test");
  assert.equal(ran, false);
});

test("whenShutdown resolves on shutdown", async () => {
  lifecycle.resetLifecycle();
  let resolved = false;
  const waiter = lifecycle.whenShutdown().then(() => {
    resolved = true;
  });
  assert.equal(resolved, false);
  await lifecycle.runShutdown("test");
  await waiter;
  assert.equal(resolved, true);
});

test("a signal runs the cleanups and always exits", async () => {
  lifecycle.resetLifecycle();
  const target = signalTarget();
  const exits = [];
  let ran = false;
  lifecycle.registerCleanup("work", () => {
    ran = true;
  });
  lifecycle.installSignalHandlers({ target, exit: (code) => exits.push(code) });

  target.emit("SIGTERM", "SIGTERM");
  assert.equal(await until(() => exits.length > 0), true, "exit was never called");
  assert.equal(ran, true);
  assert.deepEqual(exits, [143]);
});

test("a hanging cleanup cannot block the exit", async () => {
  lifecycle.resetLifecycle();
  const target = signalTarget();
  const exits = [];
  lifecycle.registerCleanup("hangs", () => new Promise(() => {}));
  lifecycle.installSignalHandlers({ target, exit: (code) => exits.push(code), deadlineMs: 60 });

  target.emit("SIGINT", "SIGINT");
  assert.equal(await until(() => exits.length > 0), true, "the deadline did not force an exit");
  assert.deepEqual(exits, [130]);
});

test("tracked children are killed on shutdown", async () => {
  lifecycle.resetLifecycle();
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
  lifecycle.trackChild(child);
  assert.equal(lifecycle.trackedChildCount(), 1);

  await lifecycle.runShutdown("test");
  assert.equal(await until(() => !alive(child.pid)), true, "tracked child survived the shutdown");
});

test("a child that exits on its own is forgotten", async () => {
  lifecycle.resetLifecycle();
  const child = spawn(process.execPath, ["-e", ""], { stdio: "ignore" });
  lifecycle.trackChild(child);
  await new Promise((resolve) => child.once("exit", resolve));
  assert.equal(await until(() => lifecycle.trackedChildCount() === 0), true, "exited child stayed tracked");
});
