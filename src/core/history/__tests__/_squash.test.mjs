/** WS6 - closing a feature as one commit, behind the gate and the tree invariant. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { applySquash, proposeSquash } from "../index.js";
import { headSha, listCommits } from "../../git/index.js";
import { commit, makeRepo, remove, run } from "../../git/__tests__/_fixture.mjs";

/** A feature branch with two commits. */
function feature() {
  const root = makeRepo();
  const fork = headSha(root);

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "a.txt", "a\n", "feat(x): first");
  commit(root, "b.txt", "b\n", "feat(x): second");

  return { root, fork };
}

test("the pre-close report names the boundary and the commits", () => {
  const { root, fork } = feature();
  const proposal = proposeSquash(root);

  assert.equal(proposal.range.baseBranch, "main", "the base is detected");
  assert.equal(proposal.range.mergeBase, fork, "the boundary is the merge base");
  assert.equal(proposal.range.count, 2, "both feature commits are in range");
  assert.equal(proposal.safe, true, "a clean tree is safe");
  assert.equal(proposal.actionable, true, "so the close is actionable");
  remove(root);
});

test("an invalid final message is refused", () => {
  const { root } = feature();
  const result = applySquash(root, { message: "closed the feature", confirm: true });

  assert.equal(result.applied, false, "a scope-less message is refused");
  assert.match(result.reason, /type\(scope\)/u, "the reason names the format");
  remove(root);
});

test("the squash refuses without confirmation", () => {
  const { root } = feature();
  const before = headSha(root);

  const result = applySquash(root, { message: "feat(x): the feature" });

  assert.equal(result.applied, false, "no confirmation means no squash");
  assert.equal(result.reason, "confirmation required", "the reason says so");
  assert.equal(headSha(root), before, "and the branch is untouched");
  remove(root);
});

test("a confirmed squash produces one commit with the feature's message and tree", () => {
  const { root, fork } = feature();
  const beforeTree = run(root, "rev-parse", "HEAD^{tree}");

  const result = applySquash(root, { message: "feat(x): the whole feature", confirm: true });

  assert.equal(result.applied, true, "the squash ran");
  assert.equal(result.verification.commits, 1, "exactly one commit is left");
  assert.equal(result.verification.treeUnchanged, true, "the final tree is unchanged");
  assert.equal(result.verification.workingTree, "clean", "the working tree is clean");
  assert.equal(result.verification.violations, 0, "and the message conforms");

  const commits = listCommits(root, `${fork}..HEAD`);

  assert.equal(commits.length, 1, "one commit in the range");
  assert.equal(commits[0].subject, "feat(x): the whole feature", "carrying the final message");
  assert.equal(run(root, "rev-parse", "HEAD^{tree}"), beforeTree, "git agrees the tree is identical");
  remove(root);
});

test("a feature that contains a merge still squashes to one commit", () => {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "a.txt", "a\n", "feat(x): first");
  run(root, "checkout", "-q", "main");
  commit(root, "m.txt", "m\n", "fix(main): drift");
  run(root, "checkout", "-q", "-b", "side");
  commit(root, "s.txt", "s\n", "feat(side): side work");
  run(root, "checkout", "-q", "feat/x");
  run(root, "merge", "-q", "--no-ff", "-m", "chore(merge): fold side", "side");

  const result = applySquash(root, { message: "feat(x): the whole feature", confirm: true });

  assert.equal(result.applied, true, "the merge is squashed away with the rest");
  assert.equal(result.verification.commits, 1, "exactly one commit is left");
  assert.equal(result.verification.merges, 0, "and no merge commit remains");
  assert.equal(result.verification.treeUnchanged, true, "with the tree intact");
  remove(root);
});
