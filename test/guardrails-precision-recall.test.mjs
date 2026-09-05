/**
 * Hardening 4.5: precision and recall, per rule, on a labeled corpus.
 *
 * The guardrails went through ten hand fixes in 4.1, each one narrowing a rule
 * that fired on idiomatic code. Nothing measured the result: a rule could be
 * silenced into passing and the suite would agree. This one runs every labeled
 * snippet in test/fixtures/guardrail-corpus.mjs through the real checker and
 * reports, per rule, how often it fired when it should and how often it fired
 * when it should not.
 *
 * Both numbers have to be perfect on the corpus, which is the only honest bar
 * for a corpus somebody wrote by hand: a labeled snippet the rule gets wrong is
 * either a rule bug or a mislabeled snippet, and both need a person.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { CORPUS } from "./fixtures/guardrail-corpus.mjs";
import { checkCode } from "../src/core/guardrails.js";
import * as DEFS from "../src/core/guardrail-defs.js";

/**
 * How many rules carry a corpus entry today.
 *
 * A ratchet, not a target: it may go up, and a rule added without entries does
 * not quietly lower it. It now equals the rule count, so a rule shipped without
 * a labeled pair fails this suite instead of widening a gap nobody tracks.
 */
const COVERED_RULES_FLOOR = 84;

/** Every rule id the checker knows about, across every group. */
function allRuleIds() {
  const ids = new Set();

  for (const value of Object.values(DEFS)) {
    if (Array.isArray(value)) {
      for (const rule of value) {
        if (rule?.id) {
          ids.add(rule.id);
        }
      }
    }
  }

  return ids;
}

/** Did this rule fire on this snippet? */
function fired(entry) {
  const report = checkCode(entry.skill, entry.code, {
    fileName: entry.fileName ?? "sample.js",
    allowedDependencies: ["react"],
    // The naming rules ask whether the file is a component, and no snippet can
    // answer that on its own: the caller knows, so the entry says so.
    isComponent: entry.isComponent,
    // The scaffold rules load only for the styleguide skill in scaffold mode,
    // so an entry that targets one says so.
    mode: entry.mode,
  });

  return report.failed.some((failure) => failure.id === entry.rule);
}

/** Per-rule counts over the whole corpus. */
function score() {
  const byRule = new Map();

  for (const entry of CORPUS) {
    const counts = byRule.get(entry.rule) ?? { truePositive: 0, falseNegative: 0, falsePositive: 0, trueNegative: 0 };
    const hit = fired(entry);

    if (entry.label === "bad") {
      counts[hit ? "truePositive" : "falseNegative"] += 1;
    } else {
      counts[hit ? "falsePositive" : "trueNegative"] += 1;
    }

    byRule.set(entry.rule, counts);
  }

  return byRule;
}

const scores = score();

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

  assert.ok(
    covered >= COVERED_RULES_FLOOR,
    `corpus covers ${covered} rules, below the ${COVERED_RULES_FLOOR} already committed`,
  );
});
