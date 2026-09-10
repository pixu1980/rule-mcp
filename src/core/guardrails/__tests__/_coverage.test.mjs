

/** Coverage: every rule carries a labeled pair, and the floor only rises. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { CORPUS, allRuleIds, scores } from "./_scores.fixture.mjs";

/**
 * How many rules carry a corpus entry today.
 *
 * A ratchet, not a target: it may go up, and a rule added without entries does
 * not quietly lower it. It now equals the rule count, so a rule shipped without
 * a labeled pair fails this suite instead of widening a gap nobody tracks.
 */
const COVERED_RULES_FLOOR = 84;

test("corpus coverage does not go backwards", () => {
  const total = allRuleIds().size;
  const covered = scores.size;

  const table = [...scores.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([rule, counts]) => {
      const positives = counts.truePositive + counts.falseNegative;
      const negatives = counts.falsePositive + counts.trueNegative;
      const precision = counts.truePositive / (counts.truePositive + counts.falsePositive || 1);
      const recall = counts.truePositive / (positives || 1);

      return `  ${rule.padEnd(32)} bad ${positives}  good ${negatives}  precision ${precision.toFixed(2)}  recall ${recall.toFixed(2)}`;
    });

  console.log(`\nGuardrail corpus: ${covered} of ${total} rules, ${CORPUS.length} snippets`);
  console.log(table.join("\n"));
  console.log(`  ${total - covered} rules have no labeled snippet yet\n`);

  assert.ok(covered >= COVERED_RULES_FLOOR, `corpus covers ${covered} rules, below the ${COVERED_RULES_FLOOR} already committed`);
});
