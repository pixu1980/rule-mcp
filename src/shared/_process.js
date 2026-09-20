

import { execFileSync, execSync } from "node:child_process";

/** The one shell-out helper: run a command, never throw. */

/**
 * Safely run a shell command, ignoring errors and returning "" on failure.
 *
 * The command string is parsed by a shell. Use {@link tryExecFile} when any
 * part of it comes from a path, a home directory or an install location: those
 * are the values a `$(...)` reaches, and a shell executes it.
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

/**
 * Safely run a program with an argument array, never throw.
 *
 * No shell parses the arguments, so a value containing `$(`, a quote, a
 * semicolon or a space arrives at the program as the single argument it was
 * passed as. This is the helper every path-bearing command uses.
 *
 * @param {string} file
 * @param {string[]} [args]
 * @param {object} [options]
 * @returns {string} stdout, or "" when the program failed or printed nothing
 */
export function tryExecFile(file, args = [], options = {}) {
  try {
    return execFileSync(file, args, { encoding: "utf8", timeout: 10_000, stdio: "pipe", ...options });
  } catch {
    return "";
  }
}
