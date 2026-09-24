

/** Git plumbing: the shared git read, and whether git knows a file. */

import { git } from "../../core/git/index.js";

// The runner lives in core/git so one implementation serves every caller. This
// module re-exports it, keeping the handon import path stable.
export { git } from "../../core/git/index.js";

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
