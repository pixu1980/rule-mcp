

/** Branch coverage for the history audit's anomaly lines. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { auditFeatureHistory } from "../_audit.js";
import { commit, makeRepo, remove, run, write } from "../../git/__tests__/_fixture.mjs";

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

test("the base branch has no feature history", () => {
  const root = makeRepo();

  try {
    const audit = auditFeatureHistory(root);

    assert.ok(audit.anomalies.some((line) => /base branch/u.test(line)));
  } finally {
    remove(root);
  }
});

test("a merge commit and a dirty tree are both named", () => {
  const root = mergedFeature();

  try {
    write(root, "f.txt", "dirty\n");

    const audit = auditFeatureHistory(root);

    assert.ok(audit.anomalies.some((line) => /merge commit/u.test(line)));
    assert.equal(audit.safe, false);
    assert.ok(audit.reasons.length > 0);
    assert.ok(audit.anomalies.some((line) => audit.reasons.includes(line)));
  } finally {
    remove(root);
  }
});

test("an operation in progress is named", () => {
  const root = mergedFeature();

  try {
    writeFileSync(join(root, ".git", "MERGE_HEAD"), "0000000000000000000000000000000000000000\n");

    const audit = auditFeatureHistory(root);

    assert.equal(audit.inProgress.any, true);
    assert.ok(audit.anomalies.some((line) => /operation is in progress/u.test(line)));
  } finally {
    remove(root);
  }
});
