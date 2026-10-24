/** @module core/git/repo - repository identity, ancestry and divergence. */

import { git, gitOk } from "./_run.js";

/**
 * Is this directory inside a git working tree?
 *
 * @param {string} projectDir
 * @returns {boolean}
 */
export function isGitRepository(projectDir) {
  return gitOk(projectDir, ["rev-parse", "--git-dir"]);
}

/**
 * The absolute git directory, resolving a linked worktree's `.git` file.
 *
 * @param {string} projectDir
 * @returns {string} "" when this is not a repository
 */
export function gitDir(projectDir) {
  return git(projectDir, ["rev-parse", "--absolute-git-dir"]);
}

/**
 * The checked-out branch, or "" on a detached HEAD.
 *
 * `rev-parse --abbrev-ref HEAD` answers the literal string "HEAD" when nothing
 * is checked out, which is not a branch name.
 *
 * @param {string} projectDir
 * @returns {string}
 */
export function currentBranch(projectDir) {
  const name = git(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"]);

  return name === "HEAD" ? "" : name;
}

/**
 * The commit HEAD points at, or "" in a repository with no commits.
 *
 * @param {string} projectDir
 * @returns {string}
 */
export function headSha(projectDir) {
  return git(projectDir, ["rev-parse", "HEAD"]);
}

/**
 * Does a local branch by this name exist?
 *
 * @param {string} projectDir
 * @param {string} branch
 * @returns {boolean}
 */
export function branchExists(projectDir, branch) {
  return gitOk(projectDir, ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`]);
}

/**
 * Does a fetched remote-tracking branch by this name exist?
 *
 * @param {string} projectDir
 * @param {string} branch
 * @param {string} [remote]
 * @returns {boolean}
 */
export function remoteBranchExists(projectDir, branch, remote = "origin") {
  return gitOk(projectDir, ["rev-parse", "--verify", "--quiet", `refs/remotes/${remote}/${branch}`]);
}

/**
 * The upstream of the current branch, or "" when it tracks nothing.
 *
 * @param {string} projectDir
 * @returns {string} e.g. "origin/main"
 */
export function upstreamBranch(projectDir) {
  return git(projectDir, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
}

/**
 * Resolve a ref to the commit it names, or "" when nothing does.
 *
 * @param {string} projectDir
 * @param {string} ref
 * @returns {string}
 */
export function resolveCommit(projectDir, ref) {
  return git(projectDir, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
}

/**
 * The best common ancestor of two refs.
 *
 * @param {string} projectDir
 * @param {string} a
 * @param {string} [b]
 * @returns {string} "" when the histories are unrelated
 */
export function mergeBase(projectDir, a, b = "HEAD") {
  return git(projectDir, ["merge-base", a, b]);
}

/**
 * Is `a` an ancestor of `b`?
 *
 * @param {string} projectDir
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function isAncestor(projectDir, a, b) {
  return gitOk(projectDir, ["merge-base", "--is-ancestor", a, b]);
}

/**
 * How far two refs have moved apart.
 *
 * @param {string} projectDir
 * @param {string} base
 * @param {string} [head]
 * @returns {{ behind: number, ahead: number }} `ahead` counts commits only on
 *   `head`, `behind` counts commits only on `base`.
 */
export function divergence(projectDir, base, head = "HEAD") {
  const out = git(projectDir, ["rev-list", "--left-right", "--count", `${base}...${head}`]);

  if (!out) {
    return { behind: 0, ahead: 0 };
  }

  const [behind, ahead] = out.split(/\s+/u).map(Number);

  return { behind, ahead };
}
