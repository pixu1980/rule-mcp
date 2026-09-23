// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** @module core/agents/commands/names - the canonical command order */

import { listPrompts } from "@src/prompts/index.js";

/** The router command, pinned first in every agent's command list. */
export const ROUTER_COMMAND = "pix";

/** General auto-detecting check workflow (ADR 106; kept by ADR 116). */
export const CHECK_COMMAND = "pix-check";

/** Deterministic guardrail fixer for the changed files. */
export const FIX_COMMAND = "pix-fix";

/**
 * Canonical command order: the router first, then all prompt names and
 * `/pix-check`, sorted locale-alphabetically. This is the single ordering used
 * everywhere commands are enumerated (installers, docs, help output).
 *
 * ADR 116: no `/pix-area-*-check` siblings; area check intent lives on the
 * parent via keyword intercept. `/pix-check` remains.
 *
 * @returns {string[]}
 */
export function commandNames() {
  const prompts = listPrompts()
    .map((p) => p.name)
    .filter((name) => name !== ROUTER_COMMAND)
    .sort((a, b) => a.localeCompare(b));

  const rest = [...prompts, CHECK_COMMAND, FIX_COMMAND].sort((a, b) => a.localeCompare(b));

  return [ROUTER_COMMAND, ...rest];
}
