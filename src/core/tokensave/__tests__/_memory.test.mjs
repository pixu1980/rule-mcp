

/**
 * @module test/tokensave/memory
 *
 * Contract for the optional session memory: a mirror is a no-op without a
 * graph, and both calls map to their TokenSave tools.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { recordDecision, sessionRecall } from "../_memory.js";

test("recordDecision reports unavailable without a graph", () => {
  const result = recordDecision("/tmp/none", { text: "use JWT" }, { probe: () => ({ available: false }) });

  assert.equal(result.ok, false);
});

test("recordDecision mirrors the decision when the graph answers", () => {
  const calls = [];
  const result = recordDecision(
    "/tmp/p",
    { text: "use JWT", reason: "legal", files: ["a.js"], tags: ["security"] },
    {
      probe: () => ({ available: true }),
      client: (tool, args) => {
        calls.push({ tool, args });

        return { ok: true, value: {} };
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(calls[0].tool, "record_decision");
  assert.equal(calls[0].args.text, "use JWT");
});

test("sessionRecall returns the payload or null", () => {
  const recalled = sessionRecall("/tmp/p", { query: "auth" }, { probe: () => ({ available: true }), client: () => ({ ok: true, value: { decisions: [] } }) });

  assert.deepEqual(recalled, { decisions: [] });
  assert.equal(sessionRecall("/tmp/none", {}, { probe: () => ({ available: false }) }), null);
});
