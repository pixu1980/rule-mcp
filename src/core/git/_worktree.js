

/**
 * @module core/git/worktree - the working tree and the pre-rewrite gate.
 *
 * Nothing that rewrites history may start on a tree git is already midway
 * through something with, and nothing may start while tracked work is
 * uncommitted: a rebase would carry it, a squash would fold it into the wrong
 * commit, and a conflict would surface it somewhere it does not belong.
 *
 * Untracked files are reported but do not block: git leaves them alone across a
 * rebase, and requiring a clean tree of them would make the gate unusable.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { gitDir, isGitRepository } from "./_repo.js";
import { parsePorcelain } from "./_porcelain.js";
import { gitResult } from "./_run.js";

/** The git-dir entries that mean one operation is unfinished. */
export const IN_PROGRESS_MARKERS = {
  merge: ["MERGE_HEAD"],
  rebase: ["rebase-merge", "rebase-apply"],
  cherryPick: ["CHERRY_PICK_HEAD"],
  revert: ["REVERT_HEAD"],
  bisect: ["BISECT_LOG"],
};

/**
 * @typedef {object} InProgress
 * @property {boolean} merge
 * @property {boolean} rebase
 * @property {boolean} cherryPick
 * @property {boolean} revert
 * @property {boolean} bisect
 * @property {boolean} any
 */

/**
 * Which operation git left half-done, if any.
 *
 * @param {string} projectDir
 * @returns {InProgress}
 */
export function inProgressOperation(projectDir) {
  const directory = gitDir(projectDir);
  const state = { merge: false, rebase: false, cherryPick: false, revert: false, bisect: false, any: false };

  if (!directory) {
    return state;
  }

  for (const [operation, markers] of Object.entries(IN_PROGRESS_MARKERS)) {
    state[operation] = markers.some((marker) => existsSync(join(directory, marker)));
    state.any = state.any || state[operation];
  }

  return state;
}

/**
 * The working tree, split by where each change lives.
 *
 * @param {string} projectDir
 * @returns {{ valid: boolean, clean: boolean, staged: Array<{ status: string, path: string }>, unstaged: Array<{ status: string, path: string }>, untracked: string[], total: number }}
 */
export function workingTreeState(projectDir) {
  if (!isGitRepository(projectDir)) {
    return { valid: false, clean: false, staged: [], unstaged: [], untracked: [], total: 0 };
  }

  const parsed = parsePorcelain(gitResult(projectDir, ["status", "--porcelain", "--untracked-files=all"], { trim: false }).stdout);
  const total = parsed.staged.length + parsed.unstaged.length + parsed.untracked.length;

  return { valid: true, clean: total === 0, ...parsed, total };
}

/**
 * @typedef {object} RewriteSafety
 * @property {boolean} safe
 * @property {string[]} reasons what blocks the rewrite, one sentence each
 * @property {InProgress} inProgress
 * @property {string[]} untracked reported, but never blocking
 */

/**
 * May a history-rewriting operation start here?
 *
 * @param {string} projectDir
 * @returns {RewriteSafety}
 */
export function rewriteSafety(projectDir) {
  if (!isGitRepository(projectDir)) {
    return {
      safe: false,
      reasons: ["not a git repository"],
      inProgress: inProgressOperation(projectDir),
      untracked: [],
    };
  }

  const inProgress = inProgressOperation(projectDir);
  const tree = workingTreeState(projectDir);
  const reasons = [];

  if (inProgress.merge) {
    reasons.push("a merge is in progress");
  }

  if (inProgress.rebase) {
    reasons.push("a rebase is in progress");
  }

  if (inProgress.cherryPick) {
    reasons.push("a cherry-pick is in progress");
  }

  if (inProgress.revert) {
    reasons.push("a revert is in progress");
  }

  if (inProgress.bisect) {
    reasons.push("a bisect is in progress");
  }

  if (tree.staged.length > 0) {
    reasons.push(`${tree.staged.length} staged change(s)`);
  }

  if (tree.unstaged.length > 0) {
    reasons.push(`${tree.unstaged.length} unstaged change(s)`);
  }

  return { safe: reasons.length === 0, reasons, inProgress, untracked: tree.untracked };
}
