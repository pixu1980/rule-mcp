/** The shell line every documented host runs, and its marker. */

import { HOOK_MARKER, shellLine } from "../../core/agents/_hook-commands.js";

/** @param {{ command: string, args?: string[] }|string} launcher @returns {{ command: string, args?: string[] }} */
export const normalized = (launcher) => (typeof launcher === "string" ? { command: launcher } : launcher);

/**
 * The shell line a native host runs: the guard subcommand plus the marker that
 * merge and uninstall look for.
 *
 * @param {{ command: string, args?: string[] }|string} launcher
 * @param {string} subcommand
 * @returns {string}
 */
export function guardCommand(launcher, subcommand) {
  const { command, args = [] } = normalized(launcher);
  // `--send` talks to the warm guard daemon (ADR 179). Install starts the daemon
  // when hooks are written; a missing daemon fails the hook loudly instead of
  // silently paying a full CLI spawn again.
  const line = shellLine([command, ...args, "guard", "--send", subcommand]);

  return `${line}  # ${HOOK_MARKER}`;
}
