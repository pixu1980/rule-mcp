/** WS2.3/WS2.4 - propose, confirm, rebase, verify, and never resolve a conflict. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { applyRebase, proposeRebase, verifyRebase } from "../index.js";
import { headSha, isAncestor, mergeBase } from "../../git/index.js";
import { commit, makeRepo, remove, run, write } from "../../git/__tests__/_fixture.mjs";

/** A repo whose `main` moved once after `feat/x` forked. */
function diverged() {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "feature.txt", "f\n", "feat(x): the feature");
  run(root, "checkout", "-q", "main");
  const mainTip = commit(root, "main.txt", "m\n", "fix(main): drift on the base");
  run(root, "checkout", "-q", "feat/x");

  return { root, mainTip };
}

test("the proposal is read-only and names the rebase command", () => {
  const { root } = diverged();
  const before = headSha(root);

  const proposal = proposeRebase(root);

  assert.equal(proposal.freshness.requiresRebase, true, "the divergence is reported");
  assert.equal(proposal.safe, true, "the tree is safe to rewrite");
  assert.equal(proposal.actionable, true, "so the rebase is actionable");
  assert.equal(proposal.command, "git rebase main", "the command is shown");
  assert.equal(headSha(root), before, "and nothing moved");
  remove(root);
});

test("the rebase refuses to run without confirmation", () => {
  const { root } = diverged();
  const before = headSha(root);

  const result = applyRebase(root);

  assert.equal(result.applied, false, "no confirmation means no rebase");
  assert.equal(result.reason, "confirmation required", "the reason says so");
  assert.equal(headSha(root), before, "and the branch is untouched");
  remove(root);
});

test("a dirty tree blocks the rebase even with confirmation", () => {
  const { root } = diverged();

  write(root, "feature.txt", "changed and not committed\n");

  const result = applyRebase(root, { confirm: true });

  assert.equal(result.applied, false, "the rebase is refused");
  assert.match(result.reason, /not safe to rewrite/u, "the reason names the tree");
  remove(root);
});

test("a confirmed rebase replays the branch onto the base, and verification says so", () => {
  const { root, mainTip } = diverged();

  const result = applyRebase(root, { confirm: true });

  assert.equal(result.applied, true, "the rebase ran");
  assert.equal(result.verification.rebaseInProgress, false, "and left nothing in progress");
  assert.equal(result.verification.freshness.behind, 0, "the branch is level with the base again");
  assert.equal(isAncestor(root, mainTip, "feat/x"), true, "the base tip is now an ancestor of the branch");
  assert.equal(mergeBase(root, "main", "feat/x"), mainTip, "the new merge base is the base tip");
  remove(root);
});

test("a conflict is reported with its files and never resolved", () => {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "seed.txt", "from the feature\n", "feat(x): edit the shared file");

  run(root, "checkout", "-q", "main");
  commit(root, "seed.txt", "from the base\n", "fix(main): edit the same file");

  run(root, "checkout", "-q", "feat/x");

  const result = applyRebase(root, { confirm: true });

  assert.equal(result.applied, false, "the rebase did not finish");
  assert.equal(result.conflicted, true, "a conflict was reported");
  assert.equal(result.verification.rebaseInProgress, true, "git left the rebase in progress");
  assert.deepEqual(result.verification.conflicts, ["seed.txt"], "the conflicted file is named");

  const verification = verifyRebase(root);

  assert.equal(verification.rebaseInProgress, true, "verifyRebase sees the same state");

  run(root, "rebase", "--abort");
  remove(root);
});
