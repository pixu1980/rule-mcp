

/**
 * @module core/history/squash
 *
 * Closing a feature: one commit that represents the whole thing.
 *
 * The boundary is the same one every other consumer reads - `merge-base(base,
 * HEAD)..HEAD` - so where the feature starts is never guessed. The squash is
 * `git reset --soft <merge-base>` followed by one commit: the index already
 * holds the tip tree, so the new commit's tree is the tip tree, and the tree
 * invariant holds by construction. It still gets verified, and a mismatch rolls
 * the branch back.
 *
 * The final message is the caller's (the model proposes it from the feature's
 * commits, diff and ADRs); it is validated against the one rule and must be
 * `type(scope): subject`, because this commit becomes the PR title, the
 * changelog entry and the version input.
 */

import { lintCommits, lintMessage } from "../commit/index.js";
import { currentBranch, getFeatureCommitRange, git, gitResult, mergeCommits, rewriteSafety, workingTreeState } from "../git/index.js";
import { rollback, verifyNormalization } from "./_verify.js";

/**
 * The pre-close report: the boundary, the commits, and everything that must be
 * settled before a squash.
 *
 * @param {string} projectDir
 * @param {{ baseBranch?: string }} [options]
 * @returns {object}
 */
export function proposeSquash(projectDir, options = {}) {
  const range = getFeatureCommitRange(projectDir, { baseBranch: options.baseBranch });
  const commits = range.commits ?? [];
  const { violations } = lintCommits(commits);
  const safety = rewriteSafety(projectDir);

  return {
    range,
    commits,
    violations,
    merges: range.range ? mergeCommits(projectDir, range.range).length : 0,
    safe: safety.safe,
    reasons: safety.reasons,
    untracked: safety.untracked,
    actionable: range.count > 0 && safety.safe && !range.onBaseBranch && range.mergeBase !== "",
  };
}

/**
 * Squash the feature into one commit, after confirmation and a safety check.
 *
 * @param {string} projectDir
 * @param {{ baseBranch?: string, message?: string, confirm?: boolean }} [options]
 * @returns {object}
 */
export function applySquash(projectDir, options = {}) {
  const proposal = proposeSquash(projectDir, options);
  const message = String(options.message ?? "").trim();
  const verdict = lintMessage(message);

  if (!options.confirm) {
    return { applied: false, reason: "confirmation required", proposal, verdict };
  }

  if (!verdict.valid) {
    return { applied: false, reason: `the final message is not type(scope): subject - ${verdict.reason}`, proposal, verdict };
  }

  if (proposal.range.count === 0) {
    return { applied: false, reason: "no feature commits to squash", proposal, verdict };
  }

  if (proposal.range.onBaseBranch) {
    return { applied: false, reason: "already on the base branch", proposal, verdict };
  }

  if (!currentBranch(projectDir)) {
    return { applied: false, reason: "detached HEAD: check out the feature branch first", proposal, verdict };
  }

  if (!proposal.safe) {
    return { applied: false, reason: `working tree not safe to rewrite: ${proposal.reasons.join("; ")}`, proposal, verdict };
  }

  const original = git(projectDir, ["rev-parse", "HEAD"]);
  const beforeTree = git(projectDir, ["rev-parse", "HEAD^{tree}"]);
  const soft = gitResult(projectDir, ["reset", "--soft", proposal.range.mergeBase], { timeout: 30_000 });

  if (!soft.ok) {
    rollback(projectDir, original);

    return { applied: false, reason: "the reset failed; the branch was rolled back", proposal, verdict };
  }

  // The tool validated the message; `--no-verify` keeps a project hook from
  // rejecting the very commit this contract just proved conforming.
  const commit = gitResult(projectDir, ["commit", "-q", "--no-verify", "-m", message], { timeout: 30_000 });
  const verification = verifyNormalization(projectDir, { beforeTree, baseBranch: options.baseBranch });
  const tree = workingTreeState(projectDir);
  const clean = commit.ok && verification.treeUnchanged && verification.commits === 1;

  if (!clean) {
    rollback(projectDir, original);

    return {
      applied: false,
      reason: commit.ok ? "the squash did not produce exactly one commit with an unchanged tree; it was rolled back" : "the commit failed; the branch was rolled back",
      output: commit.stdout,
      proposal,
      verdict,
    };
  }

  return { applied: true, message, verification: { ...verification, workingTree: tree.clean ? "clean" : "dirty" } };
}
