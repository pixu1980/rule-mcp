/**
 * @module tools/handoff/feature
 *
 * The feature commit range a handoff reports, so the document carries the same
 * boundary `/rule-git` and the feature close use. Null when there is no feature
 * range to report (no base branch, or the branch is standing on its base).
 */

import { lintCommits } from "../../core/commit/index.js";
import { getFeatureCommitRange, mergeCommits } from "../../core/git/index.js";

/**
 * @param {string} projectDir
 * @returns {{ baseBranch: string, baseRef: string, mergeBase: string, count: number, violations: number, merges: number }|null}
 */
export function featureSummary(projectDir) {
  const range = getFeatureCommitRange(projectDir);

  if (!range.baseRef || range.count === 0) {
    return null;
  }

  const { violations } = lintCommits(range.commits ?? []);
  const merges = range.range ? mergeCommits(projectDir, range.range).length : 0;

  return {
    baseBranch: range.baseBranch,
    baseRef: range.baseRef,
    mergeBase: range.mergeBase,
    count: range.count,
    violations: violations.length,
    merges,
  };
}
