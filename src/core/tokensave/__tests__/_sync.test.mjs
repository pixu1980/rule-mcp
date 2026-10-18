

/**
 * After rule writes, the graph is stale until TokenSave is told.
 *
 * `syncIndex` is the adapter's write-side counterpart: incremental sync when a
 * graph exists, a silent no-op when it does not, and a reported reason when the
 * binary refuses. It never throws, because a stale index is a degraded read,
 * not a failed write.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { syncIndex } from "../_sync.js";

const available = () => ({ available: true });
const absent = () => ({ available: false });

test("no graph means no spawn and no failure", () => {
  let called = false;
  const result = syncIndex("/tmp/x", { probe: absent, exec: () => (called = true) });

  assert.equal(called, false, "a project without a graph must not pay for a subprocess");
  assert.equal(result.synced, false);
  assert.equal(result.reason, "unavailable");
});

test("a graph is synced incrementally in the project", () => {
  const calls = [];
  const result = syncIndex("/tmp/x", {
    probe: available,
    exec: (file, args, options) => calls.push({ file, args, options }),
  });

  assert.equal(result.synced, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, ["sync"], "incremental sync, not a rebuild");
  assert.equal(calls[0].options.cwd, "/tmp/x");
});

test("a refusing binary reports why instead of throwing", () => {
  const result = syncIndex("/tmp/x", {
    probe: available,
    exec: () => {
      throw Object.assign(new Error("exited"), { stderr: "index locked" });
    },
  });

  assert.equal(result.synced, false);
  assert.match(result.reason, /index locked/);
});

test("the env switch disables the call entirely", () => {
  const previous = process.env.RULE_MCP_NO_TOKENSAVE;
  process.env.RULE_MCP_NO_TOKENSAVE = "1";

  try {
    const result = syncIndex("/tmp/x", {
      probe: available,
      exec: () => {
        throw new Error("must not run");
      },
    });

    assert.equal(result.synced, false);
  } finally {
    process.env.RULE_MCP_NO_TOKENSAVE = previous;
  }
});
