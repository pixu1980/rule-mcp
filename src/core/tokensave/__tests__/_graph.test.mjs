/**
 * @module test/tokensave/graph
 *
 * Contract for the graph-health checklist: a markdown block when the code
 * graph is available, null when it is not.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { graphHealth } from "../_graph.js";

test("graphHealth returns null without a graph", () => {
  assert.equal(graphHealth("/tmp/none", { probe: () => ({ available: false }) }), null);
});

test("graphHealth returns null when disabled", () => {
  assert.equal(graphHealth("/tmp/none", { probe: () => ({ available: true }), enabled: false }), null);
});

test("graphHealth names the architecture tools and the scope tools", () => {
  const block = graphHealth("/tmp/project", { probe: () => ({ available: true }) });

  assert.match(block, /## Graph health \(TokenSave\)/);
  assert.match(block, /tokensave_health/);
  assert.match(block, /tokensave_dsm/);
  assert.match(block, /tokensave_dependency_depth/);
  assert.match(block, /tokensave_gini/);
  assert.match(block, /tokensave_coupling/);
  assert.match(block, /tokensave_hotspots/);
  assert.match(block, /tokensave_circular/);
  assert.match(block, /tokensave_imports/);
  assert.match(block, /tokensave_impact/);
  assert.match(block, /tokensave_callers/);
  assert.match(block, /tokensave_callees/);
  assert.match(block, /tokensave_file_dependents/);
  assert.match(block, /tokensave_affected/);
  assert.match(block, /tokensave_test_map/);
  assert.match(block, /tokensave_test_risk/);
  assert.match(block, /tokensave_test_coverage/);
  assert.match(block, /tokensave_branch_list/);
  assert.match(block, /tokensave_branch_diff/);
  assert.match(block, /tokensave_session_recall/);
  assert.match(block, /tokensave_session_end/);
});
