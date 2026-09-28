

/** WS2.1 - how far the base branch moved since the fork point. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { checkBaseBranchFreshness, headSha } from "../index.js";
import { commit, makeRepo, remove, run } from "./_fixture.mjs";

test("a base that moved ahead requires a rebase", () => {
  const root = makeRepo();
  const fork = headSha(root);

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "feature.txt", "f\n", "feat(x): the feature");

  run(root, "checkout", "-q", "main");
  commit(root, "main.txt", "m\n", "fix(main): drift on the base");
  commit(root, "main2.txt", "m2\n", "fix(main): more drift");

  run(root, "checkout", "-q", "feat/x");

  const freshness = checkBaseBranchFreshness(root);

  assert.equal(freshness.baseBranch, "main", "the base is detected");
  assert.equal(freshness.mergeBase, fork, "the merge base is the fork point");
  assert.equal(freshness.ahead, 1, "one commit only on the branch");
  assert.equal(freshness.behind, 2, "two commits only on the base");
  assert.equal(freshness.requiresRebase, true, "behind means a rebase is required");
  remove(root);
});

test("a branch level with its base requires no rebase", () => {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "feature.txt", "f\n", "feat(x): the feature");

  const freshness = checkBaseBranchFreshness(root);

  assert.equal(freshness.behind, 0, "the base holds nothing new");
  assert.equal(freshness.requiresRebase, false, "so no rebase is required");
  remove(root);
});

test("standing on the base is reported as such, not as stale", () => {
  const root = makeRepo();
  const freshness = checkBaseBranchFreshness(root);

  assert.equal(freshness.onBaseBranch, true, "the branch is the base");
  assert.equal(freshness.requiresRebase, false, "and cannot be behind itself");
  assert.equal(freshness.reason, "on the base branch", "the reason says why");
  remove(root);
});

test("no base branch is reported honestly", () => {
  const root = makeRepo({ branch: "trunk" });
  const freshness = checkBaseBranchFreshness(root);

  assert.equal(freshness.baseBranch, "", "no base is named");
  assert.equal(freshness.requiresRebase, false, "nothing requires a rebase");
  assert.equal(freshness.reason, "no base branch", "the reason is stated");
  remove(root);
});

test("an explicit base branch overrides detection", () => {
  const root = makeRepo();

  run(root, "branch", "develop");

  const freshness = checkBaseBranchFreshness(root, { baseBranch: "develop" });

  assert.equal(freshness.baseBranch, "develop", "the argument is used");
  assert.equal(freshness.baseSource, "argument", "and labelled as such");
  remove(root);
});
