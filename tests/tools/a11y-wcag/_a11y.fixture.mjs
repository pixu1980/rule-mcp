/**
 * @module test/a11y-wcag/fixture
 *
 * Shared harness for the a11y determinism suites: the print-style check
 * tally plus the vendored-data and guardrail imports both halves read.
 */

export { CRITERIA, EARL_OUTCOMES, WCAG_EM_STEPS, WCAG_VERSION, criteriaForLevel, criterion } from "../../../src/core/wcag-data/index.js";
export { checkCode } from "../../../src/core/guardrails/index.js";
export { buildReport } from "../../../src/tools/a11y/index.js";

let pass = 0;
let fail = 0;

/** Print-style assertion; exit code handled by finish(). */
export const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  \u{2705} ${label}`);
  } else {
    fail++;
    console.log(`  \u{274C} ${label}`);
  }
};

/** Print the tally and set the exit code. */
export function finish() {
  console.log(`\nResults: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    process.exit(1);
  }
}
