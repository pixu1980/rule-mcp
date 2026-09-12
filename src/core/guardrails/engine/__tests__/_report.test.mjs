/**
 * getGuardrailsReport: the ruleset a skill will actually be checked against.
 *
 * The report lists what `getGuardrails` resolved rather than re-deriving the
 * families, so it cannot drift from the check (ADR 079).
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { getGuardrailsReport } from "../_report.js";
import { getGuardrails } from "../_registry.js";
import "../../__tests__/_install.fixture.mjs";

test("the report lists exactly the rules the check will run", () => {
  const report = getGuardrailsReport("rule-frontend-react");
  const rules = getGuardrails("rule-frontend-react");

  assert.match(report, /^# Guardrails: rule-frontend-react/, "the report names its skill");
  assert.match(report, new RegExp(`Total: ${rules.length} testable assertions`), "and counts them");

  for (const rule of rules) {
    assert.ok(report.includes(`**${rule.id}**`), `${rule.id} must appear in the report`);
  }
});

test("every rule is rendered as a checkbox with its label", () => {
  const report = getGuardrailsReport("rule-styleguide-css");

  assert.match(report, /## Rules/, "the rules have their own section");
  assert.match(report, /- \[ ] \*\*[\w-]+\*\*: .+/, "each rule is a checkbox naming itself");
});

test("the report closes with how to act on it", () => {
  const report = getGuardrailsReport("rule-styleguide-css");

  assert.match(report, /## How to use/);
  assert.match(report, /Re-check until all pass/, "the loop is spelled out");
});

test("a skill that inherits says where its rules came from", () => {
  const report = getGuardrailsReport("rule-devops-docker");

  assert.match(report, /Inherited from: rule-devops/, "a reader can see which declaration to edit");
  assert.ok(report.includes("**docker-non-root**"), "its own rule is there");
  assert.ok(report.includes("**secret-detection**"), "and the one it inherits");
});

test("a skill with no inheritance claims none", () => {
  const report = getGuardrailsReport("rule-process-adr");

  assert.ok(!report.includes("Inherited from:"), "nothing is claimed for a skill that inherits nothing");
});

test("an unknown skill still reports the rules that apply to everything", () => {
  const report = getGuardrailsReport("rule-not-a-real-skill");

  assert.match(report, /^# Guardrails: rule-not-a-real-skill/);
  assert.match(report, /Total: \d+ testable assertions/, "the baseline still answers");
});
