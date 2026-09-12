/** getGuardrailsReport: which sections a skill's ruleset renders. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { getGuardrailsReport } from "../_report.js";

test("every report opens with the skill, a total and the shared rules", () => {
  const report = getGuardrailsReport("rule-frontend-react");

  assert.match(report, /^# Guardrails: rule-frontend-react/, "the report names its skill");
  assert.match(report, /Total: \d+ testable assertions/, "and counts what it is asserting");
  assert.match(report, /## Shared \(all rule skills\)/, "the shared rules are always listed");
  assert.match(report, /## How to use/, "and it closes with how to act on it");
});

test("a framework skill gets its framework section", () => {
  assert.match(getGuardrailsReport("rule-frontend-react"), /## Framework-specific \(react\)/, "react rules are named for react");
});

test("a skill with no framework mapping renders no framework section", () => {
  assert.ok(!getGuardrailsReport("rule-process-adr").includes("## Framework-specific"), "nothing is invented for a non-framework skill");
});

test("the styleguide skill carries the scaffolding rules", () => {
  const report = getGuardrailsReport("rule-styleguide");

  assert.match(report, /## Project Scaffolding \(\d+ config files\)/);
  assert.match(report, /mode=scaffold/, "and says how to generate them");
});

test("backend, data and devops skills each get their own section", () => {
  assert.match(getGuardrailsReport("rule-backend-express"), /## Backend Security & API \(\d+ checks\)/);
  assert.match(getGuardrailsReport("rule-data-postgresql"), /## Database Safety \(\d+ checks\)/);
  assert.match(getGuardrailsReport("rule-devops-docker"), /## DevOps & Security \(\d+ checks\)/);
});

test("a section belongs to its own family and no other", () => {
  const frontend = getGuardrailsReport("rule-frontend-react");

  for (const section of ["Backend Security & API", "Database Safety", "DevOps & Security", "Project Scaffolding"]) {
    assert.ok(!frontend.includes(section), `a frontend skill must not carry the ${section} section`);
  }
});

test("the mode is passed through to the ruleset", () => {
  const scaffold = getGuardrailsReport("rule-styleguide", "scaffold");

  assert.match(scaffold, /Total: \d+ testable assertions/, "a mode still produces a counted report");
});
