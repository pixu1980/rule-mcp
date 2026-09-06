/** Git plumbing: run git quietly, ask whether git knows a file. */
import { execFileSync } from "node:child_process";

/**
 * Run a read-only git command. Returns "" on any failure, because "this
 * repository cannot answer that" is a verdict and not an error.
 *
 * Arguments are passed as an array, never interpolated into a shell string: a
 * branch name comes out of a handoff file, which is input.
 *
 * @param {string} cwd
 * @param {string[]} arguments_
 * @returns {string}
 */
export function git(cwd, arguments_) {
  try {
    return execFileSync("git", arguments_, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
      killSignal: "SIGKILL",
      maxBuffer: 8 * 1024 * 1024,
    }).trim();
  } catch {
    return "";
  }
}

/**
 * Has git ever known this path?
 *
 * Ignored or simply never committed, either way the repository cannot say
 * whether it was deleted or never existed, and saying so is the honest verdict.
 *
 * @param {string} projectDir
 * @param {string} file - repo-relative path
 * @returns {boolean}
 */
export function gitKnows(projectDir, file) {
  if (git(projectDir, ["log", "--oneline", "-1", "--", file])) {
    return true;
  }

  return Boolean(git(projectDir, ["ls-files", "--", file]));
}
