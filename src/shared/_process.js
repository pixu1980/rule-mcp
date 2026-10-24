import { execFileSync, execSync } from "node:child_process";

/** The one shell-out helper: run a command, never throw. */

/** Node's error codes for output that passed the capture limit. */
const CAP_CODES = new Set(["ENOBUFS", "ERR_CHILD_PROCESS_STDIO_MAXBUFFER"]);

/**
 * Whether a failure is the capture limit rather than the program.
 *
 * @param {Error & { code?: string }} [error]
 * @returns {boolean}
 */
function isCapped(error) {
  return CAP_CODES.has(error?.code);
}

/**
 * Run a shell command, never throw, and report why it ended.
 *
 * The command string is parsed by a shell. Use {@link tryExecFile} when any
 * part of it comes from a path, a home directory or an install location: those
 * are the values a `$(...)` reaches, and a shell executes it.
 *
 * This is the form for a call whose answer decides something. {@link tryExec}
 * returns "" for every failure, so a caller comparing against "" cannot tell a
 * command that died from one that printed nothing, and a probe that was killed
 * reads as "not installed".
 *
 * @param {string} command
 * @param {object} [options]
 * @returns {{ ok: boolean, stdout: string, code: number|null, capped: boolean }} `code` is the exit
 *   status, or null when no process exited: a spawn failure, a timeout, or a cap.
 */
export function tryExecResult(command, options = {}) {
  try {
    const stdout = execSync(command, { encoding: "utf8", timeout: 10_000, stdio: "pipe", ...options });

    return { ok: true, stdout, code: 0, capped: false };
  } catch (error) {
    return {
      ok: false,
      stdout: "",
      code: typeof error?.status === "number" ? error.status : null,
      capped: isCapped(error),
    };
  }
}

/**
 * Safely run a shell command, ignoring errors and returning "" on failure.
 *
 * For text-only callers: a report with no diff and a diff that is empty are the
 * same output here. A caller that branches on the answer wants
 * {@link tryExecResult}.
 *
 * @param {string} command
 * @param {object} [options]
 * @returns {string}
 */
export function tryExec(command, options = {}) {
  return tryExecResult(command, options).stdout;
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
