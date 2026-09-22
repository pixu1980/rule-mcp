

/** @module core/agents/commands/names - the canonical command order */

import { listPrompts } from "@src/prompts/index.js";

/** The router command, pinned first in every agent's command list. */
export const ROUTER_COMMAND = "rule";

/** General auto-detecting check workflow (ADR 106; kept by ADR 116). */
export const CHECK_COMMAND = "rule-check";

/**
 * Canonical command order: the router first, then all prompt names and
 * `/rule-check`, sorted locale-alphabetically. This is the single ordering used
 * everywhere commands are enumerated (installers, docs, help output).
 *
 * ADR 116: no `/rule-area-*-check` siblings; area check intent lives on the
 * parent via keyword intercept. `/rule-check` remains.
 *
 * @returns {string[]}
 */
export function commandNames() {
  const prompts = listPrompts()
    .map((p) => p.name)
    .filter((name) => name !== ROUTER_COMMAND)
    .sort((a, b) => a.localeCompare(b));

  const rest = [...prompts, CHECK_COMMAND].sort((a, b) => a.localeCompare(b));

  return [ROUTER_COMMAND, ...rest];
}
