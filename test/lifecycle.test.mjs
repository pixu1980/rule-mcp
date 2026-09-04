/**
 * @module test/lifecycle.test
 *
 * Shutdown, child reaping, session reaping, and idle memory release.
 *
 * The unit half of the process-hygiene work. Every case here is about giving
 * something back: a cleanup that runs once, a child that dies with its parent,
 * a session whose stream is gone, a cache that returns its heap and reloads
 * from disk. The integration half - a real orphan, a real signal - lives in
 * test/process-hygiene.test.mjs.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const lifecycle = await import("../src/core/lifecycle.js");

/**
 * A stand-in for `process` as a signal source: the handlers under test only
 * need on/off/emit, and a real emitter here would mean sending real signals to
 * the test runner.
 */
function signalTarget() {
  const listeners = new Map();

  return {
    on(event, handler) {
      listeners.set(event, [...(listeners.get(event) ?? []), handler]);
    },
    off(event, handler) {
      listeners.set(
        event,
        (listeners.get(event) ?? []).filter((h) => h !== handler),
      );
    },
    emit(event, ...args) {
      for (const handler of listeners.get(event) ?? []) {
        handler(...args);
      }
    },
  };
}

/** Wait until `predicate()` is true, or fail after `timeout` ms. */
async function until(predicate, timeout = 4000, step = 25) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, step));
  }

  return false;
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

// ── Error storm ───────────────────────────────────────────────────

const { installProcessErrorHandlers, STORM_LIMIT } = await import("../src/utils/sandbox.js");

test("swallowing errors stops when swallowing is all that is happening", () => {
  const target = signalTarget();
  const exits = [];
  const lines = [];
  let clock = 0;
  installProcessErrorHandlers({
    target,
    exit: (code) => exits.push(code),
    now: () => clock,
    write: (line) => lines.push(line),
  });

  // Under the limit inside the window: a bad request, not a broken process.
  for (let index = 0; index < STORM_LIMIT - 1; index++) {
    target.emit("uncaughtException", new Error("one bad request"), "test");
  }
  assert.deepEqual(exits, [], "a burst of errors must not end the process");
  assert.equal(lines.length, STORM_LIMIT - 1, "errors under the limit are still reported");

  // Past it: this is the loop that ran for thirty-six minutes.
  target.emit("uncaughtException", new Error("storm"), "test");
  assert.deepEqual(exits, [70]);

  // Once it has decided, it decides once - and stops logging, because
  // formatting the stack trace is most of what burned the CPU.
  target.emit("uncaughtException", new Error("storm"), "test");
  assert.deepEqual(exits, [70]);
  assert.equal(lines.length, STORM_LIMIT - 1, "the storm kept being logged");
});

test("errors spread over time never count as a storm", () => {
  const target = signalTarget();
  const exits = [];
  let clock = 0;
  installProcessErrorHandlers({ target, exit: (code) => exits.push(code), now: () => clock, write: () => {} });

  for (let index = 0; index < STORM_LIMIT * 3; index++) {
    clock += 2000;
    target.emit("unhandledRejection", new Error("slow trickle"));
  }
  assert.deepEqual(exits, [], "one error every two seconds is not a storm");
});

// ── Session registry ──────────────────────────────────────────────
// The SessionRegistry (src/transport/session-registry.js) lands with the transport
// merge (item 7); its tests come back with it.

// ── Idle memory release ───────────────────────────────────────────

test("releaseMemory hands the heap back and reloads from disk", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "rule-cache-release-"));
  const previous = process.env.RULE_MCP_STATE_DIR;
  process.env.RULE_MCP_STATE_DIR = stateDir;
  try {
    const cache = await import("../src/core/tool-cache.js");
    const key = cache.cacheKey("rule_tool_search", { query: "release" });
    cache.cacheSet(key, { content: [{ type: "text", text: "kept" }] });
    assert.ok(cache.cacheGet(key), "the entry was not stored");

    const freed = cache.releaseMemory();
    assert.equal(freed > 0, true, "releaseMemory reported nothing freed");
    assert.equal(cache.memoryEntryCount(), 0, "the in-memory tier was not emptied");

    // The persistent tier still has it: the next lookup reloads the file.
    const back = cache.cacheGet(key);
    assert.ok(back, "the entry did not survive the release");
    assert.equal(back.content[0].text, "kept");
  } finally {
    if (previous === undefined) {
      delete process.env.RULE_MCP_STATE_DIR;
    } else {
      process.env.RULE_MCP_STATE_DIR = previous;
    }
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("an idle server drops the search index and the skill cache", async () => {
  const { loadAllSkills, skillCache } = await import("../src/core/skills.js");
  const { isIndexReady, buildIndex } = await import("../src/core/bm25.js");
  const reclaim = await import("../src/core/reclaim.js");

  await loadAllSkills();
  buildIndex();
  assert.equal(isIndexReady(), true, "the index was not built");

  reclaim.touchActivity(1000);
  assert.equal(reclaim.reclaimIfIdle({ now: 1000 }), null, "a busy server must keep its index");
  assert.equal(isIndexReady(), true);

  const freed = reclaim.reclaimIfIdle({ now: 1000 + reclaim.IDLE_RECLAIM_MS + 1 });
  assert.ok(freed, "an idle server must reclaim");
  assert.equal(isIndexReady(), false, "the search index was not dropped");
  assert.equal(skillCache.size, 0, "the skill cache was not dropped");

  // Reclaiming twice in a row is a no-op: nothing new was allocated.
  assert.equal(reclaim.reclaimIfIdle({ now: 1000 + reclaim.IDLE_RECLAIM_MS + 2 }), null);

  // The index rebuilds on demand, so the drop costs correctness nothing.
  buildIndex();
  assert.equal(isIndexReady(), true);
});

test("the idle timer never holds the event loop open", async () => {
  const reclaim = await import("../src/core/reclaim.js");
  const timer = reclaim.startIdleReclaim();
  assert.equal(timer.hasRef(), false, "the reclaim interval must be unref'd");
  reclaim.stopIdleReclaim();
});
