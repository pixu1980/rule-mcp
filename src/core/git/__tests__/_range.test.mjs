/** WS1.3 - the one feature commit range: merge-base(base, HEAD)..HEAD. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { getFeatureCommitRange, headSha } from "../index.js";
import { commit, makeRepo, remove, run } from "./_fixture.mjs";

test("the feature range starts at the merge base and ends at HEAD", () => {
  const root = makeRepo();
  const fork = headSha(root);

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "a.txt", "a\n", "feat(x): first");
  commit(root, "b.txt", "b\n", "feat(x): second");

  run(root, "checkout", "-q", "main");
  commit(root, "m.txt", "m\n", "fix(main): drift on the base");

  run(root, "checkout", "-q", "feat/x");

  const range = getFeatureCommitRange(root);

  assert.equal(range.baseBranch, "main", "the base branch is detected");
  assert.equal(range.mergeBase, fork, "the range starts at the merge base");
  assert.equal(range.range, `${fork}..HEAD`, "the range is merge-base..HEAD");
  assert.equal(range.count, 2, "only the feature commits are counted");
  assert.equal(range.empty, false, "a developing feature is not empty");
  assert.equal(range.onBaseBranch, false, "the feature is not the base");
  assert.deepEqual(
    range.commits.map((entry) => entry.subject),
    ["feat(x): second", "feat(x): first"],
    "the feature commits come newest-first",
  );
  remove(root);
});

test("a branch standing on its base has an empty range", () => {
  const root = makeRepo();
  const range = getFeatureCommitRange(root);

  assert.equal(range.baseBranch, "main", "the base is still detected");
  assert.equal(range.mergeBase, headSha(root), "the merge base is HEAD");
  assert.equal(range.count, 0, "no feature commits yet");
  assert.equal(range.empty, true, "the range is empty");
  assert.equal(range.onBaseBranch, true, "the branch is the base");
  remove(root);
});

test("an explicit base branch overrides detection", () => {
  const root = makeRepo();

  run(root, "branch", "develop");

  const range = getFeatureCommitRange(root, { baseBranch: "develop" });

  assert.equal(range.baseBranch, "develop", "the argument is used");
  assert.equal(range.baseSource, "argument", "the source is the argument");
  remove(root);
});

test("no base branch yields an empty, explained range", () => {
  const root = makeRepo({ branch: "trunk" });
  const range = getFeatureCommitRange(root);

  assert.equal(range.baseBranch, "", "no base is named");
  assert.equal(range.count, 0, "nothing is counted");
  assert.equal(range.empty, true, "the range is empty");
  assert.equal(range.reason, "no base branch", "the reason is stated");
  remove(root);
});

test("a base branch with no common ancestor is reported", () => {
  const root = makeRepo();

  run(root, "checkout", "-q", "--orphan", "orphan");
  commit(root, "o.txt", "o\n", "feat(o): unrelated history");

  const range = getFeatureCommitRange(root, { baseBranch: "main" });

  assert.equal(range.count, 0, "unrelated histories share no commits");
  assert.equal(range.reason, "no common ancestor", "the reason is stated");
  remove(root);
});
