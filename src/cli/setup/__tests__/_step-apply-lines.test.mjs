

/** logLines shows the running task, else the last finished one, else nothing. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { logLines } from "../_step-apply.js";

test("logLines prefers the running task's output", () => {
  const lines = logLines([
    { id: "a", status: "ok", lines: ["done a"] },
    { id: "b", status: "running", lines: ["working"] },
  ]);

  assert.deepEqual(lines, ["working"], "the running task wins over finished output");
});

test("logLines falls back to the last finished task with output", () => {
  const lines = logLines([
    { id: "a", status: "ok", lines: ["done a"] },
    { id: "b", status: "running", lines: [] },
    { id: "c", status: "ok", lines: [] },
  ]);

  assert.deepEqual(lines, ["done a"], "an empty running task yields to finished output");
});

test("logLines is empty when nothing has output", () => {
  assert.deepEqual(logLines([{ id: "a", status: "pending" }]), [], "no output anywhere reads as empty");
  assert.deepEqual(logLines([]), [], "no tasks at all reads as empty");
});
