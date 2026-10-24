/** The css-flex-first guardrail itself: what an unjustified grid costs. */
import { GUARDRAIL_ID, getGuardrails, checkCode, run } from "./_flex.fixture.mjs";
import { GUARDRAILS } from "../index.js";
import test from "node:test";
import assert from "node:assert/strict";

// ── The guardrail ─────────────────────────────────────────────────
test("the guardrail is shared, so it reaches every skill", () => {
  assert.ok(
    GUARDRAILS.some((g) => g.id === GUARDRAIL_ID),
    "css-flex-first must be a shared guardrail",
  );
  for (const skill of ["rule-styleguide-css", "rule-frontend-react", "rule-ui-design-system"]) {
    const ids = new Set(getGuardrails(skill).map((g) => g.id));
    assert.ok(ids.has(GUARDRAIL_ID), `${skill} must carry ${GUARDRAIL_ID}`);
  }

  // Through the entry point rule_tool_check uses, not only the check function.
  const report = checkCode("rule-styleguide-css", '[data-part="row"] { display: grid; }', {
    fileName: "_Row.css",
  });
  const entry = report.failed.find((r) => r.id === GUARDRAIL_ID);
  assert.ok(entry, "checkCode has to report an unjustified grid among its failures");
  assert.equal(report.allPass, false);
});

test("a grid that a flex row would have done fails", () => {
  const result = run(`[data-part="row"] {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.8rem;
}`);
  assert.equal(result.pass, false);
  assert.equal(result.failCount, 1);
  assert.match(result.detail.join(" "), /row/);
  assert.match(result.suggestion, /flex/i);
});

test("inline-grid with nothing to justify it fails too", () => {
  assert.equal(run(`[data-part="chip"] { display: inline-grid; }`).pass, false);
});

test("a grid inside a media query is not a hiding place", () => {
  const result = run(`@media (min-width: 40rem) {
  [data-part="row"] {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}`);
  assert.equal(result.pass, false);
});
