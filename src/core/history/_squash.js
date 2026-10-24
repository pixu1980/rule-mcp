/**
 * @module core/history/squash
 *
 * Closing a feature: one commit that represents the whole thing, plus the
 * feature's own ADRs and handoffs consolidated into one document each.
 *
 * The boundary is `merge-base(base, HEAD)..HEAD`, the same one every other
 * consumer reads. The order is: consolidate the documents and stage them,
 * `git reset --soft <merge-base>`, one commit. The soft reset leaves the index
 * untouched, so the commit's tree is the tip tree plus exactly the planned
 * document changes - and the verification fails if any other path differs.
 *
 * The merged documents are deterministic concatenations (ADR 128); the final
 * message is the caller's, validated against the one rule because this commit
 * becomes the PR title, the changelog entry and the version input.
 */

import { rmSync } from "node:fs";
import { join } from "node:path";

import { lintCommits, lintMessage } from "../commit/index.js";
import { currentBranch, getFeatureCommitRange, git, gitLines, gitResult, mergeCommits, rewriteSafety, workingTreeState } from "../git/index.js";
import { applyConsolidation } from "./_documents-apply.js";
import { planConsolidation } from "./_documents-plan.js";
import { rollback } from "./_verify.js";

/**
 * The pre-close report: the boundary, the commits, the document consolidation
 * plan and everything that must be settled before a squash.
 *
 * @param {string} projectDir
 * @param {{ baseBranch?: string, consolidate?: boolean }} [options]
 * @returns {object}
 */
export function proposeSquash(projectDir, options = {}) {
  const range = getFeatureCommitRange(projectDir, { baseBranch: options.baseBranch });
  const commits = range.commits ?? [];
  const { violations } = lintCommits(commits);
  const safety = rewriteSafety(projectDir);
  const documents = options.consolidate === false ? null : planConsolidation(projectDir, { baseBranch: options.baseBranch, slug: options.slug });

  return {
    range,
    commits,
    violations,
    merges: range.range ? mergeCommits(projectDir, range.range).length : 0,
    documents,
    safe: safety.safe,
    reasons: safety.reasons,
    untracked: safety.untracked,
    actionable: range.count > 0 && safety.safe && !range.onBaseBranch && range.mergeBase !== "",
  };
}

/** What the rewrite produced, and whether it is exactly what was planned. */
function verifySquash(projectDir, { original, consolidation }) {
  const range = getFeatureCommitRange(projectDir);
  const changed = gitLines(projectDir, ["diff", "--name-only", `${original}..HEAD`]);
  const allowed = new Set(consolidation?.paths);
  const unexpected = changed.filter((file) => !allowed.has(file));

  return {
    commits: range.count,
    violations: lintCommits(range.commits ?? []).violations.length,
    merges: range.range ? mergeCommits(projectDir, range.range).length : 0,
    treeUnchanged: changed.length === 0,
    documentsConsolidated: Boolean(consolidation),
    changed,
    unexpected,
    valid: range.count === 1 && unexpected.length === 0,
  };
}

/** Undo a failed rewrite: drop the merged files, then restore the branch. */
function fail(projectDir, original, consolidation, reason, proposal, verdict, output) {
  for (const file of consolidation?.written ?? []) {
    rmSync(join(projectDir, file), { force: true });
  }

  rollback(projectDir, original);

  return { applied: false, reason, output, proposal, verdict };
}

/**
 * Squash the feature - code and its consolidated documents - into one commit.
 *
 * @param {string} projectDir
 * @param {{ baseBranch?: string, slug?: string, message?: string, confirm?: boolean, consolidate?: boolean }} [options]
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
  const consolidation = proposal.documents?.actionable ? applyConsolidation(projectDir, proposal.documents) : null;

  if (consolidation) {
    gitResult(projectDir, ["add", "--", ...consolidation.paths]);
  }

  if (!gitResult(projectDir, ["reset", "--soft", proposal.range.mergeBase], { timeout: 30_000 }).ok) {
    return fail(projectDir, original, consolidation, "the reset failed; the branch was rolled back", proposal, verdict);
  }

  const commit = gitResult(projectDir, ["commit", "-q", "--no-verify", "-m", message], { timeout: 30_000 });
  const verification = verifySquash(projectDir, { original, consolidation });
  const tree = workingTreeState(projectDir);
  const clean = commit.ok && verification.valid && tree.clean;

  if (!clean) {
    return fail(
      projectDir,
      original,
      consolidation,
      commit.ok ? "the squash left an unexpected change; it was rolled back" : "the commit failed; the branch was rolled back",
      proposal,
      verdict,
      commit.stdout,
    );
  }

  return { applied: true, message, verification: { ...verification, workingTree: tree.clean ? "clean" : "dirty" } };
}
