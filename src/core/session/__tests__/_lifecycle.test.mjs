/** Session lifecycle: cleanups, tracked children, signals, double shutdown. */
import { strict as assert } from "node:assert";
import { EventEmitter } from "node:events";
import { test } from "node:test";

import { installSignalHandlers, killTrackedChildren, registerCleanup, resetLifecycle, runShutdown, trackChild, trackedChildCount, whenShutdown } from "../_lifecycle.js";

test.beforeEach(() => resetLifecycle());

test("an unregistered child is ignored and a kill failure is silent", () => {
  assert.equal(trackedChildCount(), 0, "nothing tracked by default");
  trackChild(undefined);
  assert.equal(trackedChildCount(), 0, "a child without a pid is not tracked");

  const mockChild = (kill) => ({ pid: 42, kill, once() {}, removeListener() {} });
  trackChild(mockChild(() => {}));
  assert.equal(trackedChildCount(), 1, "a child with a pid is tracked");
  trackChild(mockChild(() => { throw new Error("already gone"); }));
  assert.doesNotThrow(() => killTrackedChildren("SIGTERM"), "a stale child kill is silent");
});

test("a cleanup failing reports ok false with the message", async () => {
  registerCleanup("good", async () => {});
  registerCleanup("bad", async () => {
    throw new Error("flaky");
  });

  const results = await runShutdown("test");
  assert.ok(results.find((entry) => entry.name === "good")?.ok, "the good cleanup passes");
  assert.equal(results.find((entry) => entry.name === "bad")?.ok, false, "the bad cleanup fails");
  assert.equal(results.find((entry) => entry.name === "bad")?.error, "flaky", "the error message carries");
});

test("shutdown runs once and waiters resolve", async () => {
  let ran = 0;
  registerCleanup("once", async () => {
    ran += 1;
  });

  const first = runShutdown();
  const second = runShutdown();
  assert.equal(first, second, "a second run returns the same promise");
  await first;
  assert.equal(ran, 1, "the cleanup ran once");

  const waited = await whenShutdown();
  assert.equal(waited, undefined, "a waiter after shutdown resolves");
});

test("a second signal forces the exit", () => {
  const target = new EventEmitter();
  const exits = [];
  installSignalHandlers({ target, exit: (code) => exits.push(code) });

  target.emit("SIGINT");
  target.emit("SIGINT");

  assert.equal(exits.length, 1, "the second signal exits");
  assert.equal(exits[0], 130, "SIGINT maps to 130");
});