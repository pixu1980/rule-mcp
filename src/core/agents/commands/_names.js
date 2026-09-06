/** @module core/agents/commands/names - the canonical command order */

import { listPrompts } from "../../../prompts/index.js";

/** The router command, pinned first in every agent's command list. */
export const ROUTER_COMMAND = "rule";

/**
 * Canonical command order: the router first, then all prompt names sorted
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

  return [ROUTER_COMMAND, ...prompts];
}
