

/** Branch coverage for squash: skip consolidation, refusals, dirty tree and the applied path. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { applySquash, proposeSquash } from "../index.js";
import { commit, makeRepo, remove, run } from "../../git/__tests__/_fixture.mjs";

function feature() {
  const root = makeRepo();
  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "a.txt", "a\n", "feat(x): first");
  commit(root, "b.txt", "b\n", "feat(x): second");
  return root;
}

test("proposeSquash can skip consolidation and reports the base", () => {
  const root = feature();
  const proposal = proposeSquash(root, { consolidate: false });
  assert.equal(proposal.documents, null);
  assert.equal(proposal.range.baseBranch, "main");
  assert.equal(proposal.actionable, true);
  remove(root);
});

test("proposeSquash reports the base branch with no feature work", () => {
  const root = makeRepo();
  const proposal = proposeSquash(root);
  assert.equal(proposal.range.count, 0);
  assert.equal(proposal.actionable, false);
  remove(root);
});

test("proposeSquash reports a dirty tree", () => {
  const root = feature();
  writeFileSync(join(root, "a.txt"), "changed\n");
  const proposal = proposeSquash(root);
  assert.equal(proposal.safe, false);
  assert.ok(proposal.reasons.length > 0);
  remove(root);
});

test("applySquash refuses without confirmation, a valid message, commits or a branch", () => {
  const root = feature();
  assert.equal(applySquash(root, { message: "feat(x): y" }).reason, "confirmation required");
  assert.match(applySquash(root, { message: "closed", confirm: true }).reason, /type\(scope\)/u);
  run(root, "checkout", "-q", "main");
  assert.equal(applySquash(root, { message: "feat(x): y", confirm: true }).reason, "no feature commits to squash");
  run(root, "checkout", "-q", "feat/x");
  run(root, "checkout", "-q", "--detach");
  assert.match(applySquash(root, { message: "feat(x): y", confirm: true }).reason, /detached HEAD/u);
  remove(root);
});

test("applySquash refuses a dirty tree", () => {
  const root = feature();
  writeFileSync(join(root, "a.txt"), "changed\n");
  const result = applySquash(root, { message: "feat(x): y", confirm: true });
  assert.equal(result.applied, false);
  assert.match(result.reason, /working tree not safe/u);
  remove(root);
});

test("applySquash covers the confirmed path", () => {
  const root = feature();
  const result = applySquash(root, { message: "feat(x): the whole feature", confirm: true });
  assert.equal(result.applied, true);
  assert.equal(result.verification.commits, 1);
  assert.equal(result.verification.workingTree, "clean");
  remove(root);
});

test("proposeSquash reports the base branch with no feature work", () => {
  const root = makeRepo();
  const proposal = proposeSquash(root);
  assert.equal(proposal.range.count, 0);
  assert.equal(proposal.actionable, false);
  remove(root);
});

test("applySquash refuses the base branch", () => {
  const root = makeRepo();
  const result = applySquash(root, { message: "feat(x): the whole feature", confirm: true });
  assert.equal(result.applied, false);
  assert.match(result.reason, /no feature commits/u);
  remove(root);
});
