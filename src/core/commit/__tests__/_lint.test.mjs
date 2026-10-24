/** WS3 - lint a message, a range and a push. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { lintMessage, lintPush, lintRange, renderViolations } from "../index.js";
import { headSha } from "../../git/index.js";
import { commit, makeRepo, remove, run } from "../../git/__tests__/_fixture.mjs";

test("lintMessage validates a file body and exempts system messages", () => {
  assert.equal(lintMessage("feat(auth): add OAuth\n\nSigned-off-by: x <x@y.z>").valid, true, "a scoped subject passes");
  assert.equal(lintMessage("docs: missing scope").valid, false, "a scope-less subject fails");
  assert.equal(lintMessage("docs: missing scope").reason.length > 0, true, "the failure carries a reason");
  assert.equal(lintMessage("Merge branch 'x' into 'y'").exempt, true, "a merge is exempt");
});

test("lintRange reports every non-conforming commit in the range", () => {
  const root = makeRepo();
  const base = headSha(root);

  commit(root, "a.txt", "a\n", "feat(a): a good commit");
  const bad = commit(root, "b.txt", "b\n", "added a bad commit");
  commit(root, "c.txt", "c\n", "fix(c): another good commit");

  const result = lintRange(root, `${base}..HEAD`);

  assert.equal(result.linted, 3, "three commits were linted");
  assert.equal(result.violations.length, 1, "one is rejected");
  assert.equal(result.violations[0].sha, bad, "the rejected commit is named by sha");
  assert.match(result.violations[0].reason, /not an accepted type/u, "the reason is carried");
  assert.equal(renderViolations(result.violations).length, 2, "the report is two lines per violation");
  remove(root);
});

test("a clean range has no violations", () => {
  const root = makeRepo({ seed: false });

  commit(root, "a.txt", "a\n", "feat(a): first");
  commit(root, "b.txt", "b\n", "fix(b): second");

  const result = lintRange(root, "");

  assert.equal(result.linted, 2, "both commits were linted");
  assert.deepEqual(result.violations, [], "nothing is rejected");
  remove(root);
});

test("lintPush validates the refs git is about to send", () => {
  const root = makeRepo();

  commit(root, "a.txt", "a\n", "feat(a): good");

  const remoteSha = headSha(root);

  run(root, "checkout", "-q", "-b", "feature");
  commit(root, "b.txt", "b\n", "bad message with no type");

  const localSha = headSha(root);
  const stdin = `refs/heads/feature ${localSha} refs/heads/feature ${remoteSha}\n`;

  const result = lintPush(root, stdin);

  assert.equal(result.linted, 1, "only the pushed commit is linted");
  assert.equal(result.violations.length, 1, "the bad commit is blocked");
  remove(root);
});

test("a push that deletes a ref validates nothing", () => {
  const root = makeRepo();
  const zero = "0".repeat(40);
  const stdin = `(delete) ${zero} refs/heads/gone ${headSha(root)}\n`;

  assert.equal(lintPush(root, stdin).linted, 0, "a deletion has no commit to lint");
  remove(root);
});
