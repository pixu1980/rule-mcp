

/**
 * @module core/history/linearize
 *
 * Removing the merge commits from a feature history without changing what the
 * branch contains.
 *
 * The strategy is `git rebase <merge-base>`, not `git rebase <base>`: replaying
 * the feature commits onto the fork point drops the merges and leaves the final
 * tree exactly as it was, while rebasing onto the base tip would also pull the
 * base's commits in and change the content - which is a different operation
 * (the branch-sync guard) and not this one.
 *
 * A conflict, or a merge commit that carried a change no parent has (an "evil
 * merge"), makes the final tree differ. Either way the branch is rolled back
 * and the rewrite is refused; nothing is resolved on the user's behalf.
 */

import { currentBranch, getFeatureCommitRange, git, gitLines, gitResult, mergeCommits, rewriteSafety } from "../git/index.js";
import { rollback, verifyNormalization } from "./_verify.js";

/**
 * The read-only linearization plan.
 *
 * @param {string} projectDir
 * @param {{ baseBranch?: string }} [options]
 * @returns {object}
 */
export function proposeLinearize(projectDir, options = {}) {
  const range = getFeatureCommitRange(projectDir, { baseBranch: options.baseBranch });
  const merges = range.range ? mergeCommits(projectDir, range.range) : [];
  const safety = rewriteSafety(projectDir);

  return {
    range,
    merges,
    safe: safety.safe,
    reasons: safety.reasons,
    actionable: merges.length > 0 && safety.safe && !range.onBaseBranch && range.mergeBase !== "",
    command: range.mergeBase ? `git rebase ${range.mergeBase}` : "",
  };
}

/**
 * Run the linearization, after confirmation, a safety check and the invariant.
 *
 * @param {string} projectDir
 * @param {{ baseBranch?: string, confirm?: boolean }} [options]
 * @returns {object}
 */
export function applyLinearize(projectDir, options = {}) {
  const proposal = proposeLinearize(projectDir, options);

  if (!options.confirm) {
    return { applied: false, reason: "confirmation required", proposal };
  }

  if (proposal.merges.length === 0) {
    return { applied: false, reason: "no merge commits in the feature range", proposal };
  }

  if (!currentBranch(projectDir)) {
    return { applied: false, reason: "detached HEAD: check out the feature branch first", proposal };
  }

  if (!proposal.safe) {
    return { applied: false, reason: `working tree not safe to rewrite: ${proposal.reasons.join("; ")}`, proposal };
  }

  const original = git(projectDir, ["rev-parse", "HEAD"]);
  const beforeTree = git(projectDir, ["rev-parse", "HEAD^{tree}"]);
  const result = gitResult(projectDir, ["rebase", proposal.range.mergeBase], { timeout: 120_000 });

  if (!result.ok) {
    const conflicts = gitLines(projectDir, ["diff", "--name-only", "--diff-filter=U"]);

    rollback(projectDir, original);

    return {
      applied: false,
      conflicted: true,
      conflicts,
      reason: "the rebase stopped on a conflict; the branch was rolled back",
      output: result.stdout,
      proposal,
    };
  }

  const verification = verifyNormalization(projectDir, { beforeTree, baseBranch: options.baseBranch });

  if (!verification.treeUnchanged) {
    rollback(projectDir, original);

    return { applied: false, reason: "the linear history would change the final tree; it was rolled back", proposal };
  }

  return { applied: true, verification, proposal };
}
