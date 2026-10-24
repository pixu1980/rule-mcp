/**
 * @module test/tokensave/changes
 *
 * Contract for the semantic working-tree view the handoff cites: null when the
 * graph is absent or there is nothing to say, the commit and diff payloads
 * otherwise.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { graphChanges } from "../_changes.js";

test("graphChanges returns null without a graph", () => {
  assert.equal(graphChanges("/tmp/none", { probe: () => ({ available: false }) }), null);
});

test("graphChanges returns null when the tools report nothing", () => {
  const client = (tool) =>
    tool === "commit_context" ? { ok: true, value: { message: "No changes detected." } } : { ok: true, value: { changed_files: [], modified_symbols: [] } };

  assert.equal(graphChanges("/tmp/p", { files: ["src/a.js"], probe: () => ({ available: true }), client }), null);
});

test("graphChanges returns the commit and diff payloads", () => {
  const client = (tool) => {
    if (tool === "commit_context") {
      return { ok: true, value: { message: "add the graph provider", changed_symbols: ["handoffGraph"] } };
    }

    if (tool === "log") {
      return { ok: true, value: { events: [{ short_sha: "abc1234", summary: "add the graph provider" }] } };
    }

    return { ok: true, value: { changed_files: ["src/a.js"], modified_symbols: [{ name: "a", kind: "function" }], impacted_symbols_count: 2, affected_tests: ["t.js"] } };
  };
  const result = graphChanges("/tmp/p", { files: ["src/a.js"], probe: () => ({ available: true }), client });

  assert.ok(result.commit);
  assert.ok(result.diff);
  assert.deepEqual(result.diff.changed_files, ["src/a.js"]);
  assert.equal(result.history.symbol, "a");
  assert.equal(result.history.events.length, 1);
});
