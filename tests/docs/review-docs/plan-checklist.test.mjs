/** The plan is a checklist: checkbox steps, and executed marks survive the sync. */
import { strict as assert } from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { FINDINGS, project, read, syncRoleDocs } from "./_trio.fixture.mjs";

test("the plan is a checklist: one checkbox per step, worst first, no table", () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });

  const plan = read(dir, "docs/plans/security.md");

  assert.match(plan, /^- \[ \] \*\*Step 1 - SEC-1 \(high\)\*\*: /m, "the worst finding is step 1, unchecked");
  assert.match(plan, /^- \[ \] \*\*Step 2 - SEC-2 \(medium\)\*\*: /m, "the next finding follows");
  assert.doesNotMatch(plan, /\| Step \|/, "the table form is gone");
});

test("a checked step survives the next sync while its finding stays open", () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });

  const planPath = join(dir, "docs/plans/security.md");
  writeFileSync(planPath, readFileSync(planPath, "utf8").replace("- [ ] **Step 1 - SEC-1", "- [x] **Step 1 - SEC-1"));
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });

  const plan = readFileSync(planPath, "utf8");

  assert.match(plan, /^- \[x\] \*\*Step 1 - SEC-1/m, "the executed mark is kept across the sync");
  assert.match(plan, /^- \[ \] \*\*Step 2 - SEC-2/m, "the unexecuted step stays unchecked");
});

test("a finding with sub-steps renders them as nested checkboxes under its step", () => {
  const dir = project();
  const detailed = [
    {
      id: "SEC-1",
      severity: "high",
      summary: "Token expiry compares with < instead of <=",
      steps: ["Change the comparison in the middleware", "Add the boundary test at exactly expiry"],
    },
    { id: "SEC-2", severity: "medium", summary: "Rate limit counts by token, not by remote" },
  ];

  syncRoleDocs({ role: "security", findings: detailed, projectDir: dir });

  const plan = read(dir, "docs/plans/security.md");

  assert.match(plan, /^- \[ \] \*\*Step 1 - SEC-1 \(high\)\*\*: /m, "the step line is unchanged");
  assert.match(plan, /^ {2}- \[ \] \*\*1\.1\*\*: Change the comparison in the middleware$/m, "first sub-step");
  assert.match(plan, /^ {2}- \[ \] \*\*1\.2\*\*: Add the boundary test at exactly expiry$/m, "second sub-step");
  assert.doesNotMatch(plan, /^ {2}- \[ \] \*\*2\.1\*\*/m, "a finding without sub-steps gets none");
});

test("a checked sub-step survives the next sync while its finding stays open", () => {
  const dir = project();
  const detailed = [
    {
      id: "SEC-1",
      severity: "high",
      summary: "Token expiry compares with < instead of <=",
      steps: ["Change the comparison", "Add the boundary test"],
    },
  ];

  syncRoleDocs({ role: "security", findings: detailed, projectDir: dir });

  const planPath = join(dir, "docs/plans/security.md");

  writeFileSync(planPath, readFileSync(planPath, "utf8").replace("  - [ ] **1.1**", "  - [x] **1.1**"));
  syncRoleDocs({ role: "security", findings: detailed, projectDir: dir });

  const plan = readFileSync(planPath, "utf8");

  assert.match(plan, /^ {2}- \[x\] \*\*1\.1\*\*: Change the comparison$/m, "the executed sub-step stays marked");
  assert.match(plan, /^ {2}- \[ \] \*\*1\.2\*\*: Add the boundary test$/m, "the other stays unchecked");
});
