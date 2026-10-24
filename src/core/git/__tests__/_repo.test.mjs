/** WS1.1 - repository state and commit metadata read from git. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  branchExists,
  currentBranch,
  divergence,
  headSha,
  isAncestor,
  isGitRepository,
  listCommits,
  mergeBase,
  mergeCommits,
  remoteBranchExists,
  upstreamBranch,
} from "../index.js";
import { addRemote, commit, makeRepo, remove, run } from "./_fixture.mjs";

test("isGitRepository is false outside a repository and true inside one", () => {
  const root = makeRepo();

  assert.equal(isGitRepository(root), true, "a fixture repo is a repository");
  assert.equal(isGitRepository(`${root}/does-not-exist`), false, "a missing path is not a repository");
  remove(root);
});

test("currentBranch names the branch, and is empty on a detached HEAD", () => {
  const root = makeRepo({ seed: false });
  commit(root, "a.txt", "a\n", "feat(a): first");

  assert.equal(currentBranch(root), "main", "the seeded branch is named");

  run(root, "checkout", "-q", "--detach");

  assert.equal(currentBranch(root), "", "a detached HEAD has no branch name");
  remove(root);
});

test("headSha tracks the newest commit", () => {
  const root = makeRepo({ seed: false });
  const first = commit(root, "a.txt", "a\n", "feat(a): first");

  assert.equal(headSha(root), first, "HEAD is the first commit");
  commit(root, "b.txt", "b\n", "feat(b): second");

  assert.notEqual(headSha(root), first, "HEAD moved with the second commit");
  remove(root);
});

test("branchExists and remoteBranchExists separate local from fetched", () => {
  const root = makeRepo();

  assert.equal(branchExists(root, "main"), true, "the local branch exists");
  assert.equal(branchExists(root, "feature"), false, "an unknown branch does not");

  addRemote(root);

  assert.equal(remoteBranchExists(root, "main"), true, "the fetched remote branch exists");
  assert.equal(remoteBranchExists(root, "feature"), false, "an unknown remote branch does not");
  remove(root);
});

test("upstreamBranch resolves the tracking ref, or is empty without one", () => {
  const root = makeRepo();

  assert.equal(upstreamBranch(root), "", "a branch with no upstream reports none");
  remove(root);
});

test("mergeBase is the fork point, and divergence splits ahead from behind", () => {
  const root = makeRepo();
  const fork = headSha(root);

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "feature.txt", "feature\n", "feat(x): the feature");
  commit(root, "feature2.txt", "feature2\n", "feat(x): more feature");

  run(root, "checkout", "-q", "main");
  commit(root, "main.txt", "main\n", "fix(main): drift on the base");

  assert.equal(mergeBase(root, "main", "feat/x"), fork, "the merge base is the fork point");
  assert.deepEqual(divergence(root, "main", "feat/x"), { behind: 1, ahead: 2 }, "one behind, two ahead");
  assert.equal(isAncestor(root, fork, "feat/x"), true, "the fork point is an ancestor of the feature");
  assert.equal(isAncestor(root, "feat/x", "main"), false, "the feature is not an ancestor of main");
  remove(root);
});

test("mergeCommits finds a real merge by topology, not by its subject", () => {
  const root = makeRepo();
  const fake = commit(root, "fake.txt", "fake\n", "Merge without a merge commit");

  assert.deepEqual(mergeCommits(root, ""), [], "a Merge subject is not a merge commit");

  run(root, "checkout", "-q", "-b", "side");
  commit(root, "side.txt", "side\n", "feat(side): work on the side branch");
  run(root, "checkout", "-q", "main");
  commit(root, "main.txt", "main\n", "fix(main): work on main");
  run(root, "merge", "-q", "--no-ff", "-m", "chore(merge): fold the side branch", "side");

  const merges = mergeCommits(root, "");

  assert.equal(merges.length, 1, "exactly one merge commit exists");
  assert.notEqual(merges[0], fake, "the merge is the real one, not the Merge subject");
  remove(root);
});

test("listCommits returns newest-first metadata with a merge flag", () => {
  const root = makeRepo({ seed: false });
  commit(root, "a.txt", "a\n", "feat(a): first subject");

  run(root, "checkout", "-q", "-b", "side");
  commit(root, "side.txt", "side\n", "feat(side): side work");
  run(root, "checkout", "-q", "main");
  commit(root, "main.txt", "main\n", "fix(main): main work");
  run(root, "merge", "-q", "--no-ff", "-m", "chore(merge): fold side", "side");

  const commits = listCommits(root, "");

  assert.equal(commits.length, 4, "four commits are reported");
  assert.equal(commits[0].isMerge, true, "the newest commit is the merge");
  assert.equal(commits[0].parents.length, 2, "a merge has two parents");
  assert.equal(commits[0].subject, "chore(merge): fold side", "the subject is read");

  const leaf = commits.find((entry) => entry.subject === "feat(side): side work");

  assert.equal(leaf.isMerge, false, "a leaf commit is not a merge");
  assert.equal(leaf.author, "fixture", "the author is read");
  assert.match(leaf.sha, /^[0-9a-f]{40}$/u, "the full sha is reported");
  assert.equal(leaf.short.length, 7, "the short sha is reported");
  remove(root);
});
