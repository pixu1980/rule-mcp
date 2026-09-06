/** @module tools/a11y/evaluate - validate the outcomes and settle the claim */

import { EARL_OUTCOMES, WCAG_VERSION, criteriaForLevel, criterion } from "../../core/wcag-data/index.js";

/** Outcomes that count against a conformance claim. */
export const BLOCKING = new Set(["failed", "cantTell", "untested"]);

/**
 * Validate the declared results against the conformance target and count them.
 *
 * @param {object} input - see buildReport
 * @returns {object} everything the renderers need
 */
export function evaluate(input) {
  const { scope, sample = [], results = [], evaluator = "rule-mcp", date } = input ?? {};

  if (!scope?.title || !scope?.url) {
    throw new Error(
      "scope.title and scope.url are required: a result with no declared scope cannot be reproduced or disputed",
    );
  }

  const level = scope.level ?? "AA";
  const target = criteriaForLevel(level);
  const targetNumbers = new Set(target.map((c) => c.num));

  // Validate before counting. A report that silently dropped a typo'd criterion
  // would claim coverage it does not have.
  const seen = new Map();

  for (const entry of results) {
    const found = criterion(entry.criterion);

    if (!found) {
      throw new Error(
        `Unknown WCAG criterion "${entry.criterion}". WCAG ${WCAG_VERSION} defines no such success criterion.`,
      );
    }

    if (!EARL_OUTCOMES.includes(entry.outcome)) {
      throw new Error(`Unknown outcome "${entry.outcome}". EARL defines: ${EARL_OUTCOMES.join(", ")}.`);
    }

    if (!targetNumbers.has(entry.criterion)) {
      throw new Error(
        `Criterion ${entry.criterion} is level ${found.level}, outside a level ${level} conformance target.`,
      );
    }

    seen.set(entry.criterion, { ...entry, ...found });
  }

  const counts = Object.fromEntries(EARL_OUTCOMES.map((o) => [o, 0]));

  for (const entry of seen.values()) {
    counts[entry.outcome] += 1;
  }

  const untestedList = target.filter((c) => !seen.has(c.num));

  counts.untested += untestedList.length;

  const conforms = target.every((c) => {
    const entry = seen.get(c.num);

    return Boolean(entry) && !BLOCKING.has(entry.outcome);
  });

  return {
    scope,
    sample,
    evaluator,
    level,
    target,
    seen,
    counts,
    conforms,
    summary: { level, total: target.length, ...counts, conforms },
    stamp: date ?? "(date not supplied)",
  };
}
