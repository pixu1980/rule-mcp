

/** WS5 - the handoff carries the feature commit range. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { featureSummary } from "../_feature.js";
import { featureRangeLines } from "../_sections-repo.js";
import { commit, makeRepo, remove, run } from "../../../core/git/__tests__/_fixture.mjs";

const FULL_SHA = "a".repeat(40);

test("featureRangeLines renders a parseable range, or nothing to report", () => {
  assert.deepEqual(featureRangeLines(null, { isMinimal: false }), [], "no range renders nothing");
  assert.deepEqual(featureRangeLines({ baseRef: "main", mergeBase: FULL_SHA, count: 0, violations: 0, merges: 0 }, { isMinimal: false }), [], "an empty range renders nothing");
  assert.deepEqual(featureRangeLines({ baseRef: "main", mergeBase: FULL_SHA, count: 2, violations: 0, merges: 0 }, { isMinimal: true }), [], "a minimal handoff skips the section");

  const text = featureRangeLines({ baseBranch: "main", baseRef: "origin/main", mergeBase: FULL_SHA, count: 2, violations: 1, merges: 1 }, { isMinimal: false }).join("\n");

  assert.match(text, /### Feature Range/u, "the section renders");
  assert.match(text, new RegExp(String.raw`${FULL_SHA}\.\.HEAD`, "u"), "the range is a revspec handon can parse");
  assert.match(text, /Conventional Commit violations: 1/u, "the violations are reported");
  assert.match(text, /merge commits: 1/u, "and the merge count");
});

test("featureSummary reads the feature range and its violations", () => {
  const root = makeRepo();

  run(root, "checkout", "-q", "-b", "feat/x");
  commit(root, "a.txt", "a\n", "feat(x): first");
  commit(root, "b.txt", "b\n", "no type here");

  const summary = featureSummary(root);

  assert.equal(summary.baseBranch, "main", "the base is detected");
  assert.equal(summary.count, 2, "both commits are in range");
  assert.equal(summary.violations, 1, "one violates the rule");
  assert.equal(summary.merges, 0, "there is no merge commit");
  remove(root);
});

test("featureSummary is null when there is no feature range", () => {
  const root = makeRepo();

  assert.equal(featureSummary(root), null, "standing on the base is no feature range");
  remove(root);
});
