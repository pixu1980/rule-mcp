/** WS4.2 - rewording commit messages, validated and behind the gate. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { applyReword, proposeReword } from "../index.js";
import { headSha, listCommits, mergeBase } from "../../git/index.js";
import { commit, makeRepo, remove, run } from "../../git/__tests__/_fixture.mjs";

/** A feature branch with one bad message. */
function feature() {
  const root = makeRepo();
  const fork = headSha(root);

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "a.txt", "a\n", "feat(x): good");
  const bad = commit(root, "b.txt", "b\n", "added without a type");

  return { root, fork, bad };
}

test("an invalid proposed message is reported, not applied", () => {
  const { root, bad } = feature();

  const proposal = proposeReword(root, { rewrites: [{ sha: bad, message: "still no type" }] });

  assert.equal(proposal.entries.length, 1, "the rewrite is listed");
  assert.equal(proposal.entries[0].valid, false, "and judged invalid");
  assert.ok(proposal.invalid.length === 1, "so the batch is invalid");
  remove(root);
});

test("a sha outside the feature range is refused", () => {
  const { root, fork } = feature();

  const proposal = proposeReword(root, { rewrites: [{ sha: fork, message: "chore(seed): base" }] });

  assert.equal(proposal.entries[0].inRange, false, "the base commit is outside the feature range");
  assert.equal(proposal.invalid.length, 1, "so the batch is invalid");
  remove(root);
});

test("the reword refuses to run without confirmation", () => {
  const { root, bad } = feature();
  const before = headSha(root);

  const result = applyReword(root, { rewrites: [{ sha: bad, message: "feat(x): second" }] });

  assert.equal(result.applied, false, "no confirmation means no reword");
  assert.equal(result.reason, "confirmation required", "the reason says so");
  assert.equal(headSha(root), before, "and the branch is untouched");
  remove(root);
});

test("a confirmed reword rewrites the messages and preserves the tree", () => {
  const { root, fork, bad } = feature();
  const beforeTree = run(root, "rev-parse", "HEAD^{tree}");

  const result = applyReword(root, { rewrites: [{ sha: bad, message: "feat(x): second" }], confirm: true });

  assert.equal(result.applied, true, "the reword ran");
  assert.equal(result.verification.treeUnchanged, true, "and the final tree is unchanged");
  assert.equal(result.verification.commits, 2, "the commit count is unchanged");
  assert.equal(result.verification.violations, 0, "and no violation is left");

  const subjects = listCommits(root, `${fork}..HEAD`).map((entry) => entry.subject);

  assert.deepEqual(subjects, ["feat(x): second", "feat(x): good"], "the new message is in place");
  assert.equal(run(root, "rev-parse", "HEAD^{tree}"), beforeTree, "git agrees the tree is identical");
  assert.equal(mergeBase(root, "main", "HEAD"), fork, "the base is still the fork point");
  remove(root);
});
