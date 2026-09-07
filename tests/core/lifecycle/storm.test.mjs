/** The error-storm backstop: swallowing stops when swallowing is all that happens. */
import test from "node:test";
import assert from "node:assert/strict";
import { signalTarget } from "./_lifecycle.fixture.mjs";

// ── Error storm ───────────────────────────────────────────────────

const { installProcessErrorHandlers, STORM_LIMIT } = await import("../../../src/utils/index.js");

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
