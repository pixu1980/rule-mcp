/**
 * @module core/history/verify
 *
 * The invariant every history rewrite is held to.
 *
 * The final tree before and after must be identical: normalization changes how
 * the work is recorded, never what the repository contains. A rewrite that
 * violates it is a bug in the rewrite, and the caller rolls back.
 */

import { lintCommits } from "../commit/index.js";
import { getFeatureCommitRange, git, mergeCommits } from "../git/index.js";

/**
 * Re-read the branch and state what the rewrite produced.
 *
 * @param {string} projectDir
 * @param {{ beforeTree: string, baseBranch?: string }} options
 * @returns {{ commits: number, violations: number, merges: number, treeUnchanged: boolean, beforeTree: string, afterTree: string }}
 */
export function verifyNormalization(projectDir, { beforeTree, baseBranch } = {}) {
  const range = getFeatureCommitRange(projectDir, { baseBranch });
  const { violations } = lintCommits(range.commits ?? []);
  const merges = range.range ? mergeCommits(projectDir, range.range) : [];
  const afterTree = git(projectDir, ["rev-parse", "HEAD^{tree}"]);

  return {
    commits: range.count,
    violations: violations.length,
    merges: merges.length,
    treeUnchanged: beforeTree === afterTree,
    beforeTree,
    afterTree,
  };
}

/**
 * Put the branch back where it was, after a failed or invariant-breaking rewrite.
 *
 * @param {string} projectDir
 * @param {string} original - the tip sha captured before the rewrite
 */
export function rollback(projectDir, original) {
  if (!original) {
    return;
  }

  // A stopped rebase leaves the branch mid-operation; abort it first so the
  // reset lands on a settled tree. Both commands are best-effort - the reset is
  // what restores the branch, and a failure here is reported by the caller.
  git(projectDir, ["rebase", "--abort"]);
  git(projectDir, ["reset", "--hard", original]);
}
