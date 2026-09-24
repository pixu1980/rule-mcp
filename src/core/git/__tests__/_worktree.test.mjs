

/** WS1.4 - working-tree state and the history-rewrite safety gate. */
import { strict as assert } from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { inProgressOperation, rewriteSafety, workingTreeState } from "../index.js";
import { commit, makeRepo, remove, run, write } from "./_fixture.mjs";

test("a fresh repository has a clean working tree", () => {
  const root = makeRepo();
  const state = workingTreeState(root);

  assert.equal(state.valid, true, "the repository answers");
  assert.equal(state.clean, true, "a fresh repo is clean");
  assert.deepEqual(state.staged, [], "nothing is staged");
  assert.deepEqual(state.unstaged, [], "nothing is unstaged");
  assert.deepEqual(state.untracked, [], "nothing is untracked");
  remove(root);
});

test("workingTreeState separates staged, unstaged and untracked paths", () => {
  const root = makeRepo({ seed: false });
  commit(root, "tracked.txt", "one\n", "feat(t): seed a tracked file");

  write(root, "staged.txt", "s\n");
  run(root, "add", "staged.txt");
  writeFileSync(join(root, "tracked.txt"), "two\n");
  write(root, "untracked.txt", "u\n");

  const state = workingTreeState(root);

  assert.equal(state.clean, false, "a touched tree is not clean");
  assert.deepEqual(
    state.staged.map((entry) => entry.path),
    ["staged.txt"],
    "the staged path is reported",
  );
  assert.deepEqual(
    state.unstaged.map((entry) => entry.path),
    ["tracked.txt"],
    "the unstaged path is reported",
  );
  assert.deepEqual(state.untracked, ["untracked.txt"], "the untracked path is reported");
  remove(root);
});

test("workingTreeState reports an invalid verdict outside a repository", () => {
  const state = workingTreeState("/nonexistent-rule-path");

  assert.equal(state.valid, false, "no repository means no verdict");
  assert.equal(state.clean, false, "an unknown tree is not clean");
});

test("inProgressOperation names the operation git left half-done", () => {
  const root = makeRepo();
  const gitDir = run(root, "rev-parse", "--absolute-git-dir");

  assert.equal(inProgressOperation(root).any, false, "a settled repository has none");

  writeFileSync(join(gitDir, "MERGE_HEAD"), `${run(root, "rev-parse", "HEAD")}\n`);

  assert.equal(inProgressOperation(root).merge, true, "a MERGE_HEAD means a merge is in progress");
  assert.equal(inProgressOperation(root).any, true, "the merge counts as in progress");

  rmSync(join(gitDir, "MERGE_HEAD"), { force: true });
  mkdirSync(join(gitDir, "rebase-merge"));

  assert.equal(inProgressOperation(root).rebase, true, "a rebase-merge directory means a rebase is in progress");
  assert.equal(inProgressOperation(root).merge, false, "the merge flag is gone");
  remove(root);
});

test("rewriteSafety is safe only on a settled, tracked-clean tree", () => {
  const root = makeRepo();

  assert.equal(rewriteSafety(root).safe, true, "a clean settled repository is safe to rewrite");

  write(root, "untracked.txt", "u\n");

  const withUntracked = rewriteSafety(root);

  assert.equal(withUntracked.safe, true, "an untracked file does not block a rewrite");
  assert.deepEqual(withUntracked.untracked, ["untracked.txt"], "but it is reported");

  writeFileSync(join(root, "seed.txt"), "changed\n");

  const dirty = rewriteSafety(root);

  assert.equal(dirty.safe, false, "an unstaged change blocks a rewrite");
  assert.ok(
    dirty.reasons.some((reason) => reason.includes("unstaged")),
    "the reason names the unstaged change",
  );

  run(root, "checkout", "--", "seed.txt");
  writeFileSync(join(run(root, "rev-parse", "--absolute-git-dir"), "MERGE_HEAD"), `${run(root, "rev-parse", "HEAD")}\n`);

  const merging = rewriteSafety(root);

  assert.equal(merging.safe, false, "an in-progress merge blocks a rewrite");
  assert.ok(
    merging.reasons.some((reason) => reason.includes("merge")),
    "the reason names the merge",
  );
  remove(root);
});

test("rewriteSafety refuses outside a repository", () => {
  const safety = rewriteSafety("/nonexistent-rule-path");

  assert.equal(safety.safe, false, "no repository is never safe");
  assert.ok(
    safety.reasons.some((reason) => reason.includes("not a git repository")),
    "the reason says why",
  );
});
