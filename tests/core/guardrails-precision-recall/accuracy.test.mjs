/** Precision and recall: perfect on the labeled corpus, from both sides. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { allRuleIds, scores } from "./_scores.fixture.mjs";

test("every rule in the corpus is a rule the checker has", () => {
  const known = allRuleIds();
  const invented = [...scores.keys()].filter((id) => !known.has(id));

  assert.deepEqual(invented, [], "a corpus entry for a rule that does not exist measures nothing");
});

test("every labeled violation makes its rule fire", () => {
  const missed = [];

  for (const [rule, counts] of scores) {
    if (counts.falseNegative > 0) {
      missed.push(`${rule}: ${counts.falseNegative} of ${counts.truePositive + counts.falseNegative} missed`);
    }
  }

  assert.deepEqual(missed, [], "a rule that stays silent on a real violation is a rule nobody should trust");
});

test("no rule fires on the idiomatic code beside it", () => {
  const overreach = [];

  for (const [rule, counts] of scores) {
    if (counts.falsePositive > 0) {
      overreach.push(`${rule}: ${counts.falsePositive} of ${counts.falsePositive + counts.trueNegative} false`);
    }
  }

  assert.deepEqual(overreach, [], "a rule that fires on idiomatic code teaches everyone to ignore the output");
});

test("every rule in the corpus is labeled from both sides", () => {
  const lopsided = [];

  for (const [rule, counts] of scores) {
    const positives = counts.truePositive + counts.falseNegative;
    const negatives = counts.falsePositive + counts.trueNegative;

    if (positives === 0 || negatives === 0) {
      lopsided.push(`${rule}: ${positives} bad, ${negatives} good`);
    }
  }

  assert.deepEqual(lopsided, [], "one-sided entries can be satisfied by a rule that fires always or never");
});
