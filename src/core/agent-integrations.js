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
 * @see module:core/detector - hasTokensave
 * @see module:core/caveman - output compression (complementary token saving)
 */

import { hasTokensave } from "./detector.js";
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

import { addDirective, addSuppression, getTokenStats, resetTokenStats as _resetStats } from "./token-stats.js";

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

const _pipeline = { directiveEmitted: false };

/** Reset pipeline state (tests). */
export function resetTokenPipeline() {
  _pipeline.directiveEmitted = false;
  _resetStats();
}

/** Minimum block size (lines) before suppression kicks in. */
const SUPPRESS_MIN_LINES_DEFAULT = 40;

/**
 * Suppress a heavy context block when tokensave is active AND the block is big
 * enough to be worth it. Below the threshold the block passes through untouched
 * (suppressing small blocks costs more than it saves).
 */
export function suppressIfTokensave(block, opts = {}) {
  const { projectDir, label = "context", minLines } = opts;
  if (!tokensaveActive(projectDir)) {
    return block;
  }
  const threshold = Number(minLines ?? process.env.RULE_MCP_SUPPRESS_MIN_LINES) || SUPPRESS_MIN_LINES_DEFAULT;
  const lineCount = block.split("\n").length;
  if (lineCount < threshold) {
    return block;
  }
  const bytesSaved = block.length;
  addSuppression(bytesSaved);
  const terse = _pipeline.directiveEmitted;
  return `${terse ? TOKENSAVE_TERSE : TOKENSAVE_DIRECTIVE}\n\n_(${label} suppressed - ${lineCount} lines omitted; query tokensave for detail.)_`;
}

/** Tools whose large outputs may be truncated when tokensave is active. */
export const TOKENSAVE_SUPPRESSIBLE = new Set(["rule_tool_fix"]);

const TRUNCATE_MIN_LINES_DEFAULT = 120;

/**
 * Router-side decoration: prepend the tokensave directive ONCE per process
 * (full text first time, nothing afterwards - terse travels with suppressions)
 * and truncate allowlisted heavy outputs beyond RULE_MCP_SUPPRESS_MIN_LINES.
 *
 * @param {string} name - tool name
 * @param {object} core - deterministic result core
 * @param {object} [args] - validated tool arguments (path/target/projectDir used)
 */
export function decorateWithTokensave(name, core, args = {}) {
  if (!core || core.isError || !Array.isArray(core.content)) {
    return core;
  }
  // Test-fixture tools (registered by suites) must keep exact payloads.
  if (name.startsWith("test_")) {
    return core;
  }
  if (process.env.RULE_MCP_NO_TOKENSAVE === "1") {
    return core;
  }
  const dir = resolveTokensaveDir(args?.path || args?.target || args?.projectDir);
  if (!dir) {
    return core;
  }

  let content = [...core.content];
  if (!_pipeline.directiveEmitted) {
    // Emit ONCE per process, but DEFER when the primary payload is JSON:
    // several tools (pix_tool, gateway receipts) contract content[0] to be
    // machine-parsed - decorating it would break their consumers.
    const first = content.find((item) => item?.type === "text" && typeof item.text === "string");
    const isJsonPayload = Boolean(first && (first.text.startsWith("{") || first.text.startsWith("[")));
    if (!isJsonPayload) {
      content = [{ type: "text", text: TOKENSAVE_DIRECTIVE }, ...content];
      _pipeline.directiveEmitted = true;
      addDirective("full");
    }
  }

  if (TOKENSAVE_SUPPRESSIBLE.has(name)) {
    const threshold = Number(process.env.RULE_MCP_SUPPRESS_MIN_LINES) || TRUNCATE_MIN_LINES_DEFAULT;
    content = content.map((item) => {
      if (item?.type !== "text" || typeof item.text !== "string") {
        return item;
      }
      const allLines = item.text.split("\n");
      if (allLines.length < threshold) {
        return item;
      }
      const kept = [
        ...allLines.slice(0, 20),
        `… (${allLines.length - 25} lines omitted - the .tokensave graph has the detail; set RULE_MCP_NO_TOKENSAVE=1 for full output)`,
        ...allLines.slice(-5),
      ].join("\n");
      addSuppression(item.text.length - kept.length);
      _pipeline.directiveEmitted = true;
      return { ...item, text: kept + "\n\n" + TOKENSAVE_TERSE };
    });
  }
  return { ...core, content };
}

/** Live token-savings snapshot (compression + suppression). */
export function getTokenSavings() {
  return getTokenStats();
}
