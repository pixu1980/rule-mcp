/** WCAG 2.2 criteria catalog barrel: meta plus per-guideline tables. */
export * from "./meta.js";
import { CRITERIA_1_1 } from "./criteria-1-1.js";
import { CRITERIA_1_2 } from "./criteria-1-2.js";
import { CRITERIA_1_3 } from "./criteria-1-3.js";
import { CRITERIA_1_4 } from "./criteria-1-4.js";
import { CRITERIA_2_1 } from "./criteria-2-1.js";
import { CRITERIA_2_2 } from "./criteria-2-2.js";
import { CRITERIA_2_3 } from "./criteria-2-3.js";
import { CRITERIA_2_4 } from "./criteria-2-4.js";
import { CRITERIA_2_5 } from "./criteria-2-5.js";
import { CRITERIA_3_1 } from "./criteria-3-1.js";
import { CRITERIA_3_2 } from "./criteria-3-2.js";
import { CRITERIA_3_3 } from "./criteria-3-3.js";
import { CRITERIA_4_1 } from "./criteria-4-1.js";

/** All WCAG 2.2 criteria, keyed by criterion number (reassembled from guideline slices). */
export const CRITERIA = { ...CRITERIA_1_1, ...CRITERIA_1_2, ...CRITERIA_1_3, ...CRITERIA_1_4, ...CRITERIA_2_1, ...CRITERIA_2_2, ...CRITERIA_2_3, ...CRITERIA_2_4, ...CRITERIA_2_5, ...CRITERIA_3_1, ...CRITERIA_3_2, ...CRITERIA_3_3, ...CRITERIA_4_1 };

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
