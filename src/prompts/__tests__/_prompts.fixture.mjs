// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
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

export const WORKFLOW_PROMPTS = ["pix-handoff"];

export const AREA_PROMPTS = [
  "pix-area-toolset",
  "pix-area-frontend",
  "pix-area-backend",
  "pix-area-data",
  "pix-area-toolchain",
  "pix-area-styleguide",
  "pix-area-process",
  "pix-area-devops",
  "pix-area-platform",
  "pix-area-ai",
  "pix-area-skills",
  "pix-area-ui",
];

export const ONE_SHOT_PROMPTS = ["pix-adr", "pix-flight", "pix-handon", "pix-init", "pix-process-check", "pix-update"];

export const EXPECTED = [...WORKFLOW_PROMPTS, ...AREA_PROMPTS];

// ── Structure ────────────────────────────────────────────────────

export const prompts = listPrompts();
export const names = prompts.map((p) => p.name);

export { getPrompt, listPrompts } from "../index.js";
export { parseHandoffOptions } from "../_handoff-options.js";
