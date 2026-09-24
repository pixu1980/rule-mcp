

/** WS1.2 - base-branch detection, explicit configuration first. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { BASE_BRANCH_CONFIG_KEY, BASE_BRANCH_ENV, detectBaseBranch } from "../index.js";
import { addRemote, commit, makeRepo, remove, run } from "./_fixture.mjs";

// Deterministic regardless of the developer's shell.
delete process.env[BASE_BRANCH_ENV];

test("an explicit branch argument wins over every other source", () => {
  const root = makeRepo();

  run(root, "config", BASE_BRANCH_CONFIG_KEY, "develop");
  process.env[BASE_BRANCH_ENV] = "release";

  const detected = detectBaseBranch(root, { baseBranch: "main" });

  assert.equal(detected.branch, "main", "the argument is authoritative");
  assert.equal(detected.source, "argument", "and is labelled as such");
  delete process.env[BASE_BRANCH_ENV];
  remove(root);
});

test("git config rule.baseBranch is read before the environment", () => {
  const root = makeRepo();

  run(root, "config", BASE_BRANCH_CONFIG_KEY, "develop");
  process.env[BASE_BRANCH_ENV] = "release";

  const detected = detectBaseBranch(root);

  assert.equal(detected.branch, "develop", "the repository config wins");
  assert.equal(detected.source, "config", "the source is config");
  delete process.env[BASE_BRANCH_ENV];
  remove(root);
});

test("RULE_MCP_BASE_BRANCH is read when no config is set", () => {
  const root = makeRepo();

  process.env[BASE_BRANCH_ENV] = "release";

  const detected = detectBaseBranch(root);

  assert.equal(detected.branch, "release", "the environment supplies the base");
  assert.equal(detected.source, "env", "the source is env");
  delete process.env[BASE_BRANCH_ENV];
  remove(root);
});

test("origin/HEAD decides when nothing is configured", () => {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feature");
  commit(root, "feature.txt", "f\n", "feat(f): work on a feature");
  addRemote(root, "feature");

  const detected = detectBaseBranch(root);

  assert.equal(detected.branch, "feature", "origin/HEAD names the base");
  assert.equal(detected.source, "origin-head", "the source is the remote head");
  remove(root);
});

test("the conventional base branches are tried in order: develop, main, master", () => {
  const develop = makeRepo();

  run(develop, "branch", "develop");

  assert.equal(detectBaseBranch(develop).branch, "develop", "develop is preferred when present");
  assert.equal(detectBaseBranch(develop).source, "convention", "the source is the convention");
  remove(develop);

  const main = makeRepo();

  assert.equal(detectBaseBranch(main).branch, "main", "main is used on a main-shaped repo");
  remove(main);

  const master = makeRepo({ branch: "master" });

  assert.equal(detectBaseBranch(master).branch, "master", "master is used on a master-shaped repo");
  remove(master);
});

test("origin/HEAD resolves to the remote-tracking ref", () => {
  const root = makeRepo();

  addRemote(root);

  const detected = detectBaseBranch(root);

  assert.equal(detected.branch, "main", "the branch name is reported");
  assert.equal(detected.ref, "origin/main", "origin/HEAD resolves through the remote-tracking ref");
  assert.equal(detected.source, "origin-head", "the remote head is the source");
  remove(root);
});

test("the convention prefers a local trunk to its remote copy", () => {
  const root = makeRepo();

  addRemote(root);
  run(root, "symbolic-ref", "--delete", "refs/remotes/origin/HEAD");

  const detected = detectBaseBranch(root);

  assert.equal(detected.branch, "main", "the branch name is reported");
  assert.equal(detected.ref, "main", "the local branch is preferred to origin/main");
  assert.equal(detected.source, "convention", "without origin/HEAD the convention decides");
  remove(root);
});

test("no candidate anywhere is reported honestly", () => {
  const root = makeRepo({ branch: "trunk" });

  const detected = detectBaseBranch(root);

  assert.equal(detected.branch, "", "no base branch is named");
  assert.equal(detected.ref, "", "no ref is resolved");
  assert.equal(detected.source, "none", "the source says none");
  remove(root);
});
