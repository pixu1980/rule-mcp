/**
 * @module core/sync/rebase
 *
 * Proposing and running the rebase that brings a branch onto its base.
 *
 * Two calls, never one. `proposeRebase` is read-only and writes nothing;
 * `applyRebase` refuses to run without `confirm`, re-checks that the tree is
 * safe, and verifies what git left behind. A conflict is reported with its
 * files and left for the person to resolve - the tool never guesses a
 * resolution, and an in-progress rebase is never aborted on their behalf.
 */

import { checkBaseBranchFreshness, gitLines, gitResult, inProgressOperation, rewriteSafety, workingTreeState } from "../git/index.js";

/**
 * What git left after a rebase attempt.
 *
 * @param {string} projectDir
 * @returns {{ rebaseInProgress: boolean, complete: boolean, conflicts: string[], workingTree: string, staged: number, unstaged: number, freshness: import("../git/index.js").BaseFreshness }}
 */
export function verifyRebase(projectDir) {
  const inProgress = inProgressOperation(projectDir);
  const status = workingTreeState(projectDir);

  return {
    rebaseInProgress: inProgress.rebase,
    complete: !inProgress.rebase,
    conflicts: gitLines(projectDir, ["diff", "--name-only", "--diff-filter=U"]),
    workingTree: status.clean ? "clean" : "dirty",
    staged: status.staged.length,
    unstaged: status.unstaged.length,
    freshness: checkBaseBranchFreshness(projectDir),
  };
}

/**
 * The read-only rebase plan: freshness, working-tree safety and the command.
 *
 * @param {string} projectDir
 * @param {{ baseBranch?: string, fetch?: boolean }} [options]
 * @returns {object}
 */
export function proposeRebase(projectDir, options = {}) {
  const freshness = checkBaseBranchFreshness(projectDir, options);
  const safety = rewriteSafety(projectDir);

  return {
    freshness,
    safe: safety.safe,
    reasons: safety.reasons,
    untracked: safety.untracked,
    actionable: freshness.requiresRebase && safety.safe && !freshness.onBaseBranch && !freshness.reason,
    command: freshness.baseRef ? `git rebase ${freshness.baseRef}` : "",
  };
}

/**
 * Run the rebase, after confirmation and a fresh safety check.
 *
 * @param {string} projectDir
 * @param {{ baseBranch?: string, fetch?: boolean, confirm?: boolean }} [options]
 * @returns {object} `{ applied, reason, proposal }`, plus `verification` and
 *   `conflicted`/`output` when the rebase stopped
 */
export function applyRebase(projectDir, options = {}) {
  const proposal = proposeRebase(projectDir, options);

  if (!options.confirm) {
    return { applied: false, reason: "confirmation required", proposal };
  }

  if (proposal.freshness.onBaseBranch) {
    return { applied: false, reason: "already on the base branch", proposal };
  }

  if (!proposal.freshness.requiresRebase) {
    return { applied: false, reason: "already up to date with the base branch", proposal };
  }

  if (!proposal.safe) {
    return { applied: false, reason: `working tree not safe to rewrite: ${proposal.reasons.join("; ")}`, proposal };
  }

  const result = gitResult(projectDir, ["rebase", proposal.freshness.baseRef], { timeout: 120_000 });
  const verification = verifyRebase(projectDir);

  if (!result.ok) {
    return {
      applied: false,
      conflicted: verification.rebaseInProgress,
      reason: "rebase stopped",
      verification,
      output: result.stdout,
    };
  }

  return { applied: true, verification };
}
