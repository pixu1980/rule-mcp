/**
 * @module core/review/roles/command-name
 *
 * Canonical slash-command / prompt name for a review persona: one command per
 * role, `rule-persona-<roleId>`. The operation is no longer part of the name;
 * it is decided from the request (ADR 120, see `./_operation-intent.js`).
 */

const PREFIX = "rule-persona-";

/**
 * The command/prompt name for one role.
 *
 * @param {string} roleId
 * @returns {string}
 */
export function personaCommandName(roleId) {
  return `${PREFIX}${roleId}`;
}

/**
 * The role id in a persona command name: whatever follows the prefix, including
 * a dash (`supply-chain`). Callers reject a name whose id is no active role.
 *
 * @param {string} name
 * @returns {{ roleId: string }|null}
 */
export function parsePersonaCommand(name) {
  if (typeof name !== "string" || !name.startsWith(PREFIX)) {
    return null;
  }

  const roleId = name.slice(PREFIX.length);

  return roleId === "" ? null : { roleId };
}
