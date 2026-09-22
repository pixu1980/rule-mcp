

/**
 * @module core/review/roles/command-name
 *
 * Canonical slash-command / prompt names for review personas.
 * Format: `rule-persona-<roleId>-<operation>` (operation is plan|audit|review).
 */

import { OPERATIONS } from "../template/_operation.js";

const OPERATIONS_SET = new Set(OPERATIONS);

/**
 * The command/prompt name for one role and operation.
 *
 * @param {string} roleId
 * @param {"plan"|"audit"|"review"} operation
 * @returns {string}
 */
export function personaCommandName(roleId, operation) {
  return `rule-persona-${roleId}-${operation}`;
}

/**
 * Parse a persona command name into role id and operation.
 *
 * @param {string} name
 * @returns {{ roleId: string, operation: "plan"|"audit"|"review" }|null}
 */
export function parsePersonaCommand(name) {
  if (typeof name !== "string" || !name.startsWith("rule-persona-")) {
    return null;
  }

  const rest = name.slice("rule-persona-".length);
  const lastDash = rest.lastIndexOf("-");

  if (lastDash <= 0) {
    return null;
  }

  const operation = rest.slice(lastDash + 1);
  const roleId = rest.slice(0, lastDash);

  if (!OPERATIONS_SET.has(operation) || roleId === "") {
    return null;
  }

  return { roleId, operation };
}
