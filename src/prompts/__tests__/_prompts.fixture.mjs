

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

console.log("prompts registry test");

// ── Expected registry ────────────────────────────────────────────

export const WORKFLOW_PROMPTS = ["rule-handoff"];

export const AREA_PROMPTS = [
  "rule-area-toolset",
  "rule-area-frontend",
  "rule-area-backend",
  "rule-area-data",
  "rule-area-toolchain",
  "rule-area-styleguide",
  "rule-area-process",
  "rule-area-devops",
  "rule-area-platform",
  "rule-area-ai",
  "rule-area-skills",
  "rule-area-ui",
];

export const ONE_SHOT_PROMPTS = ["rule-adr", "rule-flight", "rule-handon", "rule-init", "rule-process-check", "rule-update"];

export const EXPECTED = [...WORKFLOW_PROMPTS, ...AREA_PROMPTS];

// ── Structure ────────────────────────────────────────────────────

export const prompts = listPrompts();
export const names = prompts.map((p) => p.name);

export { getPrompt, listPrompts } from "../index.js";
export { parseHandoffOptions } from "../_handoff-options.js";
