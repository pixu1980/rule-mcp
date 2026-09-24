

/**
 * @module core/git/range - the one feature commit range.
 *
 * Every consumer that needs "the commits this feature added" asks the same
 * question and gets the same answer:
 *
 *   merge-base(baseBranch, HEAD)..HEAD
 *
 * Handoff, close-feature, `git audit` and squash all read it from here, so the
 * boundary cannot differ between them.
 */

import { detectBaseBranch } from "./_base.js";
import { listCommits } from "./_commits.js";
import { currentBranch, mergeBase } from "./_repo.js";

/**
 * @typedef {object} FeatureRange
 * @property {string} baseBranch
 * @property {string} baseRef the ref the base was resolved to
 * @property {"argument"|"config"|"env"|"origin-head"|"convention"|"none"} baseSource
 * @property {string} headBranch the checked-out branch
 * @property {string} head
 * @property {string} mergeBase "" when there is none
 * @property {string} range "" when there is none
 * @property {number} count
 * @property {import("./_commits.js").CommitRecord[]} commits newest first
 * @property {boolean} empty
 * @property {boolean} onBaseBranch the feature is standing on its own base
 * @property {string} [reason] why the range could not be built
 */

/**
 * Build the feature commit range for the current branch.
 *
 * @param {string} projectDir
 * @param {{ baseBranch?: string, head?: string }} [options]
 * @returns {FeatureRange}
 */
export function getFeatureCommitRange(projectDir, options = {}) {
  const head = options.head ?? "HEAD";
  const detected = detectBaseBranch(projectDir, options);
  const headBranch = currentBranch(projectDir);
  const base = {
    baseBranch: detected.branch,
    baseRef: detected.ref,
    baseSource: detected.source,
    head,
    headBranch,
    mergeBase: "",
    range: "",
    count: 0,
    commits: [],
    empty: true,
    onBaseBranch: detected.branch !== "" && detected.branch === headBranch,
  };

  if (!detected.ref) {
    return { ...base, reason: "no base branch" };
  }

  const common = mergeBase(projectDir, detected.ref, head);

  if (!common) {
    return { ...base, reason: "no common ancestor" };
  }

  const commits = listCommits(projectDir, `${common}..${head}`);

  return {
    ...base,
    mergeBase: common,
    range: `${common}..${head}`,
    count: commits.length,
    commits,
    empty: commits.length === 0,
  };
}
