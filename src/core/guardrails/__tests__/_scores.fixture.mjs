

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
import { CORPUS } from "../../../../tests/fixtures/guardrail-corpus.mjs";
import { checkCode } from "../index.js";
import * as DEFS from "../index.js";

/** Every rule id the checker knows about, across every group. */
export function allRuleIds() {
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

export const scores = score();

export { CORPUS } from "../../../../tests/fixtures/guardrail-corpus.mjs";
