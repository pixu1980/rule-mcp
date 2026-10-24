

/**
 * @module test/prompts/fixture
 *
 * Validates the MCP prompt registry (src/prompts/index.js):
 *   - structure: unique kebab-case names, strict argument schema, getPrompt impl
 *   - coverage: 5 workflow one-shot + 15 area prompts
 *   - content rules: every prompt message proposes a commit with scope and
 *     involves TDD/a11y baselines (or asks the user what to do)
 */

import { listPrompts } from "../index.js";
import { listAreaPrompts } from "../_areas.js";

console.log("prompts registry test");

// ── Expected registry ────────────────────────────────────────────

export const WORKFLOW_PROMPTS = ["rule-mcp-handoff"];

// The area prompts are derived from the resolved skill catalog, one per area hub
// (ADR 117), so the fixture asks the catalog rather than freezing a list that
// a new hub would silently contradict.
export const AREA_PROMPTS = listAreaPrompts().map((prompt) => prompt.name);

export const ONE_SHOT_PROMPTS = ["rule-mcp-compress", "rule-mcp-git", "rule-mcp-handon", "rule-mcp-init", "rule-mcp-stats", "rule-mcp-update", "rule-mcp-usage"];

export const EXPECTED = [...WORKFLOW_PROMPTS, ...AREA_PROMPTS];

// ── Structure ────────────────────────────────────────────────────

export const prompts = listPrompts();
export const names = prompts.map((p) => p.name);

export { getPrompt, listPrompts } from "../index.js";
export { parseHandoffOptions } from "../_handoff-options.js";
