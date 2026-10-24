/**
 * @module core/history/audit
 *
 * The read-only feature-history report.
 *
 * Everything in it comes from git or from the one commit rule: the branch, the
 * merge base, the commit range and its count, the merge commits found by
 * topology, the Conventional Commit violations, and the working-tree state that
 * decides whether a rewrite may start at all. The audit writes nothing.
 */

import { lintCommits } from "../commit/index.js";
import { getFeatureCommitRange, inProgressOperation, mergeCommits, rewriteSafety } from "../git/index.js";

/**
 * @param {string} projectDir
 * @param {{ baseBranch?: string }} [options]
 * @returns {object} the range, its violations, its merge commits, the safety
 *   verdict and the human-readable anomalies
 */
export function auditFeatureHistory(projectDir, options = {}) {
  const range = getFeatureCommitRange(projectDir, options);
  const commits = range.commits ?? [];
  const { violations } = lintCommits(commits);
  const bySha = new Map(commits.map((commit) => [commit.sha, commit]));
  const merges = (range.range ? mergeCommits(projectDir, range.range) : []).map((sha) => bySha.get(sha) ?? { sha, short: sha.slice(0, 7), subject: "" });
  const safety = rewriteSafety(projectDir);
  const inProgress = inProgressOperation(projectDir);
  const anomalies = [];

  if (range.reason) {
    anomalies.push(range.reason);
  }

  if (range.onBaseBranch) {
    anomalies.push("the branch is the base branch; there is no feature history to normalize");
  }

  if (merges.length > 0) {
    anomalies.push(`${merges.length} merge commit(s) in the feature range`);
  }

  if (!safety.safe) {
    anomalies.push(...safety.reasons);
  }

  if (inProgress.any) {
    anomalies.push("a git operation is in progress");
  }

  return {
    range,
    violations,
    merges,
    safe: safety.safe,
    reasons: safety.reasons,
    untracked: safety.untracked,
    inProgress,
    anomalies,
  };
}
