

/** WS4.1/WS4.3 - the read-only feature-history audit. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { auditFeatureHistory } from "../index.js";
import { commit, makeRepo, remove, run, write } from "../../git/__tests__/_fixture.mjs";

test("a linear feature history reports its range, its commits and its violations", () => {
  const root = makeRepo();
  const fork = run(root, "rev-parse", "HEAD");

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "a.txt", "a\n", "feat(x): good");
  commit(root, "b.txt", "b\n", "added without a type");

  const audit = auditFeatureHistory(root);

  assert.equal(audit.range.baseBranch, "main", "the base is reported");
  assert.equal(audit.range.mergeBase, fork, "the merge base is the fork point");
  assert.equal(audit.range.count, 2, "both commits are in range");
  assert.equal(audit.violations.length, 1, "one commit violates the rule");
  assert.equal(audit.merges.length, 0, "a linear history has no merge commits");
  assert.equal(audit.safe, true, "a clean tree is safe to rewrite");
  remove(root);
});

test("a merge commit is found by topology", () => {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "f.txt", "f\n", "feat(x): the feature");
  run(root, "checkout", "-q", "-b", "side");
  commit(root, "s.txt", "s\n", "feat(side): side work");
  run(root, "checkout", "-q", "feat/x");
  run(root, "merge", "-q", "--no-ff", "-m", "chore(merge): fold side", "side");

  const audit = auditFeatureHistory(root);

  assert.equal(audit.merges.length, 1, "the merge commit is found");
  assert.ok(
    audit.anomalies.some((anomaly) => anomaly.includes("merge commit")),
    "and is named as an anomaly",
  );
  remove(root);
});

test("a dirty tree is reported as unsafe", () => {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "f.txt", "f\n", "feat(x): the feature");
  write(root, "f.txt", "changed and not committed\n");

  const audit = auditFeatureHistory(root);

  assert.equal(audit.safe, false, "an unstaged change is unsafe");
  assert.ok(
    audit.reasons.some((reason) => reason.includes("unstaged")),
    "the reason is carried",
  );
  remove(root);
});

test("standing on the base branch explains that there is no feature history", () => {
  const root = makeRepo();
  const audit = auditFeatureHistory(root);

  assert.equal(audit.range.onBaseBranch, true, "the branch is the base");
  assert.ok(
    audit.anomalies.some((anomaly) => anomaly.includes("base branch")),
    "and the audit says so",
  );
  remove(root);
});
