/**
 * @module core/git/freshness
 *
 * How far the base branch has moved since this branch forked.
 *
 * Git answers all of it, so nothing is inferred: the base branch, the merge
 * base, and the two commit counts. `requiresRebase` is exactly "the base holds
 * commits this branch does not", which is what a rebase would replay.
 *
 * Fetching is opt-in. The guard on the tool-call path reads local state only,
 * because a fetch is a network round trip; a caller that wants the remote's
 * current position asks for it explicitly.
 */

import { detectBaseBranch } from "./_base.js";
import { currentBranch, divergence, mergeBase } from "./_repo.js";
import { gitResult } from "./_run.js";

/**
 * The remote a base ref belongs to: "origin/main" -> "origin", "main" -> "origin".
 *
 * @param {string} ref
 * @returns {string}
 */
function remoteOf(ref) {
  const slash = ref.indexOf("/");

  return slash === -1 ? "origin" : ref.slice(0, slash);
}

/**
 * @typedef {object} BaseFreshness
 * @property {string} baseBranch
 * @property {string} baseRef
 * @property {"argument"|"config"|"env"|"origin-head"|"convention"|"none"} baseSource
 * @property {string} mergeBase "" when there is none
 * @property {number} ahead commits only on this branch
 * @property {number} behind commits only on the base
 * @property {boolean} requiresRebase the base moved ahead of the fork point
 * @property {boolean} onBaseBranch the checked-out branch is the base
 * @property {boolean} fetched a fetch actually ran
 * @property {string} reason why the check could not answer, when it could not
 */

/**
 * Check whether the base branch contains commits the current branch lacks.
 *
 * @param {string} projectDir
 * @param {{ baseBranch?: string, head?: string, fetch?: boolean }} [options]
 * @returns {BaseFreshness}
 */
export function checkBaseBranchFreshness(projectDir, options = {}) {
  const detected = detectBaseBranch(projectDir, options);
  const freshness = {
    baseBranch: detected.branch,
    baseRef: detected.ref,
    baseSource: detected.source,
    mergeBase: "",
    ahead: 0,
    behind: 0,
    requiresRebase: false,
    onBaseBranch: false,
    fetched: false,
    reason: "",
  };

  if (!detected.ref) {
    return { ...freshness, reason: "no base branch" };
  }

  const branch = currentBranch(projectDir);

  if (!branch) {
    return { ...freshness, reason: "detached HEAD" };
  }

  if (branch === detected.branch) {
    return { ...freshness, onBaseBranch: true, reason: "on the base branch" };
  }

  if (options.fetch) {
    const result = gitResult(projectDir, ["fetch", "--quiet", remoteOf(detected.ref)], { timeout: 20_000 });

    freshness.fetched = result.ok;
  }

  const common = mergeBase(projectDir, detected.ref, branch);

  if (!common) {
    return { ...freshness, reason: "no common ancestor" };
  }

  const { ahead, behind } = divergence(projectDir, detected.ref, branch);

  return { ...freshness, mergeBase: common, ahead, behind, requiresRebase: behind > 0 };
}
