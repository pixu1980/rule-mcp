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
