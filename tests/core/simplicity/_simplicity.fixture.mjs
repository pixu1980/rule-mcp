/**
 * @module test/simplicity/fixture.test
 *
 * Verifies the anti-over-engineering constraint:
 *   - the workflow reminder states the minimal-change rule and the proactive-ADR rule
 *   - the router emits a scope contract, and a doc followup on structural prompts
 *   - the simplicity guardrails ship in SHARED (so every skill enforces them)
 *   - those guardrails fire on slop and stay silent on this repo's own source
 *     (a new guardrail that fails on committed code is a false positive, not a find)
 */

process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

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
