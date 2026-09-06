import { CRITERIA } from "./_criteria.data.js";

/**
 * One criterion by number.
 *
 * @param {string} number_ - e.g. "1.4.3"
 * @returns {{ num: string, id: string, handle: string, level: string, guideline: string, principle: string }|undefined}
 */
export function criterion(number_) {
  return CRITERIA[number_];
}

/**
 * Every criterion at or below a conformance level. "AA" returns A and AA, which
 * is what a conformance claim at AA actually requires.
 *
 * @param {"A"|"AA"|"AAA"} level
 * @returns {Array<object>}
 */
export function criteriaForLevel(level) {
  const included = { A: ["A"], AA: ["A", "AA"], AAA: ["A", "AA", "AAA"] }[level] ?? ["A", "AA"];

  return Object.values(CRITERIA).filter((c) => included.includes(c.level));
}
