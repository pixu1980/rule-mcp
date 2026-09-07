import { execSync } from "node:child_process";
/** The one shell-out helper: run a command, never throw. */

/**
 * Safely run a shell command, ignoring errors and returning "" on failure.
 *
 * @param {string} command
 * @param {object} [options]
 * @returns {string}
 */
export function tryExec(command, options = {}) {
  try {
    return execSync(command, { encoding: "utf8", timeout: 10_000, stdio: "pipe", ...options });
  } catch {
    return "";
  }
}
