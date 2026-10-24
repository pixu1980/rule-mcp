

/** Branch coverage for linearization's refusals: no merges, detached HEAD and a dirty tree. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { applyLinearize, proposeLinearize } from "../index.js";
import { commit, makeRepo, remove, run, write } from "../../git/__tests__/_fixture.mjs";

/** A feature branch whose merge commit folds a side branch. */
function mergedFeature() {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "f.txt", "f\n", "feat(x): the feature");
  run(root, "checkout", "-q", "main");
  run(root, "checkout", "-q", "-b", "side");
  commit(root, "s.txt", "s\n", "feat(side): side work");
  run(root, "checkout", "-q", "feat/x");
  run(root, "merge", "--no-ff", "-m", "chore(merge): fold side", "side");

  return root;
}

/** A feature branch with a linear history. */
function linearFeature() {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "a.txt", "a\n", "feat(x): first");

  return root;
}

test("a branch with no merge commits has nothing to linearize", () => {
  const root = linearFeature();

  try {
    const result = applyLinearize(root, { confirm: true });

    assert.equal(result.applied, false);
    assert.match(result.reason, /no merge commits/u);
  } finally {
    remove(root);
  }
});

test("a detached HEAD is refused", () => {
  const root = mergedFeature();

  try {
    run(root, "checkout", "-q", "--detach");

    const result = applyLinearize(root, { confirm: true });

    assert.equal(result.applied, false);
    assert.match(result.reason, /detached HEAD/u);
  } finally {
    remove(root);
  }
});

test("a dirty working tree is refused", () => {
  const root = mergedFeature();

  try {
    write(root, "f.txt", "dirty\n");

    const result = applyLinearize(root, { confirm: true });

    assert.equal(result.applied, false);
    assert.match(result.reason, /working tree not safe/u);
  } finally {
    remove(root);
  }
});

test("the plan on the base branch has no merges", () => {
  const root = makeRepo();

  try {
    const proposal = proposeLinearize(root);

    assert.equal(proposal.merges.length, 0);
    assert.equal(proposal.actionable, false);
  } finally {
    remove(root);
  }
});
