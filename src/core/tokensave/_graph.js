/**
 * @module core/tokensave/graph
 *
 * The architecture-health checklist a persona run cites.
 *
 * When the code graph is available, the plan prompt names the TokenSave tools
 * to run and what each answers, so the audit evidence table carries graph
 * numbers instead of a hand-rolled scan. The checklist is deliberately a
 * checklist, not raw results: a prompt pays for every token, and the agent
 * runs the tools at the moment it needs them.
 *
 * @see module:core/tokensave/probe - the availability check
 */

import { probeFilesystem } from "./_probe.js";

/** The graph checks the checklist names, in report order. */
export const GRAPH_CHECKS = [
  { tool: "tokensave_health", what: "the 0-10000 quality signal and its five root-cause dimensions" },
  { tool: "tokensave_dsm", what: "clusters, density, and layering violations (format: stats)" },
  { tool: "tokensave_dependency_depth", what: "the longest file-level dependency chains" },
  { tool: "tokensave_gini", what: "inequality for complexity or lines (metric, scope)" },
  { tool: "tokensave_coupling", what: "the files everything depends on, or the ones depending on everything (direction)" },
  { tool: "tokensave_hotspots", what: "the most connected symbols" },
  { tool: "tokensave_circular", what: "circular file dependencies" },
  { tool: "tokensave_imports", what: "module-level cycles and the import statements holding them (depth)" },
  { tool: "tokensave_impact", what: "the impact radius of a symbol before changing it" },
  { tool: "tokensave_callers", what: "who calls a symbol, directly or transitively" },
  { tool: "tokensave_callees", what: "what a symbol calls, up to a depth" },
  { tool: "tokensave_file_dependents", what: "the files that import or depend on a file" },
  { tool: "tokensave_affected", what: "the test files a set of changed sources reaches" },
  { tool: "tokensave_test_map", what: "the tests that cover a symbol" },
  { tool: "tokensave_test_risk", what: "the high-risk, weakly-tested symbols where the next test should go" },
  { tool: "tokensave_test_coverage", what: "per-symbol, per-file and per-test coverage" },
  { tool: "tokensave_branch_list", what: "the tracked branches and how stale each one is" },
  { tool: "tokensave_branch_search", what: "a symbol on another branch without switching the checkout" },
  { tool: "tokensave_branch_diff", what: "the symbols a branch added, removed or changed" },
  { tool: "tokensave_session_recall", what: "the decisions and code areas a past session recorded" },
  { tool: "tokensave_session_start", what: "a health baseline to measure the run against" },
  { tool: "tokensave_session_end", what: "the health delta this run produced" },
];

/**
 * The markdown checklist, or null when the graph is absent or disabled.
 *
 * @param {string} [projectDir] - Project root to probe
 * @param {{ probe?: Function, enabled?: boolean }} [options]
 * @returns {string|null}
 */
export function graphHealth(projectDir = process.cwd(), { probe = probeFilesystem, enabled } = {}) {
  if (enabled === false || process.env.RULE_MCP_NO_TOKENSAVE === "1") {
    return null;
  }

  if (!probe(projectDir).available) {
    return null;
  }

  return [
    "## Graph health (TokenSave)",
    "",
    "Run these before writing the audit and cite their numbers in the evidence table:",
    "",
    ...GRAPH_CHECKS.map((check) => `- \`${check.tool}\` - ${check.what}`),
    "",
  ].join("\n");
}
