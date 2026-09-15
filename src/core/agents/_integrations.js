

/**
 * @module core/agents/integrations
 *
 * Cross-agent integrations that reduce token usage:
 *
 * - tokensave: when the target project ships a `.tokensave/` code graph, rule
 *   tools defer code exploration to tokensave and SUPPRESS their own redundant
 *   context dumps (file trees, git diffs), emitting a short directive instead.
 *
 * These helpers are pure and deterministic so they compose with the result cache.
 *
 * @see module:core/detector - hasTokensave
 * @see module:core/text/compression - output compression (complementary token saving)
 */

import { hasTokensave } from "../detector/index.js";
import { dirname } from "node:path";

/**
 * One-line directive appended to outputs when a project has tokensave.
 * Tells the agent to use the code graph instead of re-reading files.
 */
export const TOKENSAVE_DIRECTIVE =
  "## TOKENSAVE ACTIVE - this project has a .tokensave code graph. " +
  "Use tokensave_context / tokensave_search for code exploration; do NOT re-read files, " +
  "glob, or grep. The context below is intentionally trimmed - query the graph for detail.";

/**
 * Whether tokensave-aware context suppression is enabled for a project path.
 * Honors the RULE_MCP_NO_TOKENSAVE opt-out.
 *
 * @param {string} [projectDir] - Project root (defaults to cwd)
 * @returns {boolean}
 */
export function tokensaveActive(projectDir = process.cwd()) {
  if (process.env.RULE_MCP_NO_TOKENSAVE === "1") {
    return false;
  }

  return resolveTokensaveDir(projectDir) !== null;
}

/** Multi-source project resolution: explicit arg > env var > cwd, then walk-up. */
export function resolveTokensaveDir(explicitDir) {
  const candidates = [];

  if (explicitDir) {
    candidates.push(explicitDir);
  }

  if (process.env.RULE_MCP_PROJECT_DIR) {
    candidates.push(process.env.RULE_MCP_PROJECT_DIR);
  }

  candidates.push(process.cwd());

  for (const base of candidates) {
    let dir = base;

    for (let depth = 0; depth < 6 && dir; depth++) {
      if (hasTokensave(dir)) {
        return dir;
      }

      const parent = dirname(dir);

      if (parent === dir) {
        break;
      }

      dir = parent;
    }
  }

  return null;
}

/** Terse directive for subsequent emissions (after the first full one). */
export const TOKENSAVE_TERSE = "[tokensave] prefer ts_context/ts_search over file reads.";

export * from "./_token-pipeline.js";
