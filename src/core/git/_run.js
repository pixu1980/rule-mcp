/**
 * @module core/git/run
 *
 * The one git runner: argument arrays, never a shell string.
 *
 * A branch name, a path or a ref is input - it can come from a handoff file, a
 * config value or an environment variable. Building a command string around one
 * lets a `$(...)` in it run. Every read below passes an array, so the value
 * arrives at git as the single argument it was passed as.
 *
 * Three shapes, because three questions are asked:
 *   - {@link gitResult}: how did git end? Use when the exit code decides something.
 *   - {@link git}: what did git print? Empty covers both "nothing" and "failed".
 *   - {@link gitOk}: did git succeed? For a command that answers through its exit code.
 */

import { execFileSync } from "node:child_process";

/** A git read never hangs a tool call, and never truncates a large diff. */
const TIMEOUT_MS = 5000;
const MAX_BUFFER = 8 * 1024 * 1024;

/**
 * Run one git command and report how it ended.
 *
 * @param {string} projectDir
 * @param {string[]} args
 * @param {{ timeout?: number, trim?: boolean }} [options] `trim: false` keeps the
 *   leading space of a porcelain line, which is a status field and not padding.
 * @returns {{ ok: boolean, stdout: string, code: number|null }} `code` is null when
 *   no process exited: a spawn failure or a timeout.
 */
export function gitResult(projectDir, args, options = {}) {
  const trim = options.trim ?? true;

  try {
    const stdout = execFileSync("git", args, {
      cwd: projectDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: options.timeout ?? TIMEOUT_MS,
      killSignal: "SIGKILL",
      maxBuffer: MAX_BUFFER,
    });

    return { ok: true, stdout: trim ? stdout.trim() : stdout, code: 0 };
  } catch (error) {
    const stdout = typeof error?.stdout === "string" ? error.stdout : "";

    return { ok: false, stdout: trim ? stdout.trim() : stdout, code: typeof error?.status === "number" ? error.status : null };
  }
}

/**
 * Run one read-only git command and return its trimmed stdout.
 *
 * @param {string} projectDir
 * @param {string[]} args
 * @returns {string} "" when git fails or prints nothing
 */
export function git(projectDir, args) {
  return gitResult(projectDir, args).stdout;
}

/**
 * Run a git command whose answer is its exit code, printing nothing.
 *
 * `git merge-base --is-ancestor` and `git rev-parse --verify --quiet` both work
 * this way, so an empty stdout cannot be read as a verdict.
 *
 * @param {string} projectDir
 * @param {string[]} args
 * @returns {boolean}
 */
export function gitOk(projectDir, args) {
  return gitResult(projectDir, args).ok;
}

/**
 * Run one git command and split its newline-separated stdout.
 *
 * @param {string} projectDir
 * @param {string[]} args
 * @returns {string[]}
 */
export function gitLines(projectDir, args) {
  const out = git(projectDir, args);

  return out ? out.split("\n").filter(Boolean) : [];
}
