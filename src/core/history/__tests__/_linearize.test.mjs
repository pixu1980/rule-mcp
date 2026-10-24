/** WS4.4/WS4.5/WS4.6 - removing merge commits, and rolling back when the tree would change. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

import { applyLinearize, proposeLinearize } from "../index.js";
import { headSha, inProgressOperation } from "../../git/index.js";
import { commit, makeRepo, remove, run, write } from "../../git/__tests__/_fixture.mjs";

/** Run git in a fixture, tolerating a non-zero exit (a conflicting merge). */
function attempt(root, ...args) {
  try {
    execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

    return true;
  } catch {
    return false;
  }
}

/** A branch whose merge commit folds a side branch, with or without a conflict. */
function merged({ conflict = false } = {}) {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/x");

  if (conflict) {
    write(root, "seed.txt", "from feat\n");
    run(root, "add", "-A");
    run(root, "commit", "-q", "-m", "feat(x): edit the shared file");
  } else {
    commit(root, "f.txt", "f\n", "feat(x): the feature");
  }

  run(root, "checkout", "-q", "main");
  run(root, "checkout", "-q", "-b", "side");

  if (conflict) {
    write(root, "seed.txt", "from side\n");
    run(root, "add", "-A");
    run(root, "commit", "-q", "-m", "feat(side): edit the shared file");
  } else {
    commit(root, "s.txt", "s\n", "feat(side): side work");
  }

  run(root, "checkout", "-q", "feat/x");
  attempt(root, "merge", "--no-ff", "-m", "chore(merge): fold side", "side");

  if (conflict) {
    write(root, "seed.txt", "merged\n");
    run(root, "add", "-A");
    run(root, "commit", "-q", "--no-edit");
  }

  return root;
}

test("a merge is proposed and the strategy rebases onto the merge base", () => {
  const root = merged();
  const proposal = proposeLinearize(root);

  assert.equal(proposal.merges.length, 1, "the merge is found");
  assert.equal(proposal.actionable, true, "and the linearization is actionable");
  assert.match(proposal.command, /git rebase/u, "the command is shown");
  remove(root);
});

test("linearize refuses without confirmation", () => {
  const root = merged();
  const before = headSha(root);

  const result = applyLinearize(root);

  assert.equal(result.applied, false, "no confirmation means no rewrite");
  assert.equal(result.reason, "confirmation required", "the reason says so");
  assert.equal(headSha(root), before, "and the branch is untouched");
  remove(root);
});

test("a confirmed linearize removes the merges and preserves the tree", () => {
  const root = merged();
  const beforeTree = run(root, "rev-parse", "HEAD^{tree}");

  const result = applyLinearize(root, { confirm: true });

  assert.equal(result.applied, true, "the linearization ran");
  assert.equal(result.verification.merges, 0, "no merge commit is left");
  assert.equal(result.verification.treeUnchanged, true, "and the final tree is unchanged");
  assert.equal(run(root, "rev-parse", "HEAD^{tree}"), beforeTree, "git agrees the tree is identical");
  remove(root);
});

test("a conflict is reported and the branch is rolled back untouched", () => {
  const root = merged({ conflict: true });
  const before = headSha(root);
  const beforeTree = run(root, "rev-parse", "HEAD^{tree}");

  const result = applyLinearize(root, { confirm: true });

  assert.equal(result.applied, false, "the rewrite did not finish");
  assert.equal(result.conflicted, true, "a conflict was reported");
  assert.deepEqual(result.conflicts, ["seed.txt"], "the conflicted file is named");
  assert.equal(headSha(root), before, "and the branch was rolled back to where it was");
  assert.equal(run(root, "rev-parse", "HEAD^{tree}"), beforeTree, "with the tree intact");
  assert.equal(inProgressOperation(root).any, false, "and no rebase is left in progress");
  remove(root);
});
