

/** @module core/agents/commands/names - the canonical command order */

import { listPrompts } from "@src/prompts/index.js";
import { listAreaPrompts } from "@src/prompts/_areas.js";

/** The router command, pinned first in every agent's command list. */
export const ROUTER_COMMAND = "rule";

/** Check command for general auto-detection. */
export const CHECK_COMMAND = "rule-check";

/**
 * Canonical command order: the router first, then all prompt names and check commands sorted
 * locale-alphabetically. This is the single ordering used everywhere commands
 * are enumerated (installers, docs, help output).
 *
 * @returns {string[]}
 */
export function commandNames() {
  const prompts = listPrompts()
    .map((p) => p.name)
    .filter((name) => name !== ROUTER_COMMAND)
    .sort((a, b) => a.localeCompare(b));

  // Add check subcommands for area commands (rule-area-*-check)
  const areaPrompts = listAreaPrompts();
  const areaCheckCommands = areaPrompts
    .map((p) => `${p.name}-check`);

  // Combine all commands and sort alphabetically (except router which is pinned first)
  const allCommands = [...prompts, ...areaCheckCommands, CHECK_COMMAND].sort((a, b) => a.localeCompare(b));

  return [ROUTER_COMMAND, ...allCommands];
}
