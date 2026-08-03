/**
 * @module core/agent-integrations
 *
 * Cross-agent integrations that reduce token usage:
 *
 * - tokensave: when the target project ships a `.tokensave/` code graph, rule
 *   tools defer code exploration to tokensave and SUPPRESS their own redundant
 *   context dumps (file trees, git diffs), emitting a short directive instead.
 *
 * These helpers are pure and deterministic so they compose with the result cache.
 *
 * @see module:core/detector — hasTokensave
 * @see module:core/caveman — output compression (complementary token saving)
 */

import { hasTokensave } from "./detector.js";

/**
 * One-line directive appended to outputs when a project has tokensave.
 * Tells the agent to use the code graph instead of re-reading files.
 */
export const TOKENSAVE_DIRECTIVE =
  "## TOKENSAVE ACTIVE — this project has a .tokensave code graph. " +
  "Use tokensave_context / tokensave_search for code exploration; do NOT re-read files, " +
  "glob, or grep. The context below is intentionally trimmed — query the graph for detail.";

/**
 * Whether tokensave-aware context suppression is enabled for a project path.
 * Honors the RULE_MCP_NO_TOKENSAVE opt-out.
 *
 * @param {string} [projectDir] — Project root (defaults to cwd)
 * @returns {boolean}
 */
export function tokensaveActive(projectDir = process.cwd()) {
  if (process.env.RULE_MCP_NO_TOKENSAVE === "1") {return false;}
  return hasTokensave(projectDir);
}

/**
 * Given a block of "redundant context" (a file tree, a git diff, a context dump),
 * return either the block unchanged, or a trimmed placeholder + directive when
 * tokensave is active for the project.
 *
 * @param {string} block — The heavy context the tool would otherwise emit
 * @param {{ projectDir?: string, label?: string }} [opts]
 * @returns {string}
 */
export function suppressIfTokensave(block, opts = {}) {
  const { projectDir = process.cwd(), label = "context" } = opts;
  if (!tokensaveActive(projectDir)) {return block;}
  return `${TOKENSAVE_DIRECTIVE}\n\n_(${label} suppressed — ${countLines(block)} lines omitted; query tokensave for detail.)_`;
}

/**
 * Prepend the tokensave directive to a text when active, otherwise return as-is.
 *
 * @param {string} text
 * @param {{ projectDir?: string }} [opts]
 * @returns {string}
 */
export function annotateTokensave(text, opts = {}) {
  const { projectDir = process.cwd() } = opts;
  if (!tokensaveActive(projectDir)) {return text;}
  return `${TOKENSAVE_DIRECTIVE}\n\n${text}`;
}

/** @param {string} s @returns {number} */
function countLines(s) {
  if (!s) {return 0;}
  return s.split("\n").length;
}
