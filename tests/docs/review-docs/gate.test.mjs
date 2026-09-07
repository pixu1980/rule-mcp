/** validateTrio: every drift the gate must catch, and what it must leave alone. */
import { strict as assert } from "node:assert";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { FINDINGS, project, syncRoleDocs, validateTrio } from "./_trio.fixture.mjs";

// The rule_tool_plan_docs tool-call tests land with the MCP surface phase
// (item 9); the module behavior is pinned above and below this gap.
// ── C.3: the gate over the trio ──

test("a trio the helper wrote passes the gate", () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });

  assert.deepEqual(validateTrio({ projectDir: dir }), [], "what the helper writes is what the gate accepts");
});

test("the gate catches a review that lost its link to the audit", () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });
  const review = join(dir, "docs/reviews/security.md");
  writeFileSync(review, readFileSync(review, "utf8").replace("../audits/security.md", "somewhere else"));

  const problems = validateTrio({ projectDir: dir });
  assert.equal(problems.length, 1, `expected one problem, got ${JSON.stringify(problems)}`);
  assert.match(problems[0].reason, /audit/, "the reason names what the link should have pointed at");
});

test("the gate catches an audit that is missing under a review", () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });
  rmSync(join(dir, "docs/audits/security.md"));

  assert.match(
    validateTrio({ projectDir: dir })
      .map((problem) => problem.reason)
      .join(" "),
    /audit/,
    "a review whose evidence is gone is a review nobody can check",
  );
});

test("the gate catches a plan step pointing at a finding the review does not have open", () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });
  const plan = join(dir, "docs/plans/security.md");
  writeFileSync(plan, readFileSync(plan, "utf8").replace("SEC-1", "SEC-404"));

  const problems = validateTrio({ projectDir: dir });
  assert.match(problems.map((problem) => problem.reason).join(" "), /SEC-404/, "the dangling id is named");
});

test("the gate catches a plan left behind when nothing is open", () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });
  const plan = readFileSync(join(dir, "docs/plans/security.md"), "utf8");
  syncRoleDocs({ role: "security", findings: [], projectDir: dir });
  syncRoleDocs({ role: "security", findings: [], projectDir: dir });
  writeFileSync(join(dir, "docs/plans/security.md"), plan);

  assert.match(
    validateTrio({ projectDir: dir })
      .map((problem) => problem.reason)
      .join(" "),
    /open/,
    "a plan for a clean review is a plan that should have been deleted",
  );
});

test("the gate catches a document with no date header", () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });
  const audit = join(dir, "docs/audits/security.md");
  writeFileSync(audit, readFileSync(audit, "utf8").replace(/- \*\*Date\*\*: .*/, ""));

  assert.match(
    validateTrio({ projectDir: dir })
      .map((problem) => problem.reason)
      .join(" "),
    /date/i,
    "a document without a date cannot say whether it is current",
  );
});

test("dated plans that belong to nobody are left alone", () => {
  const dir = project();
  mkdirSync(join(dir, "docs/plans"), { recursive: true });
  writeFileSync(join(dir, "docs/plans/2026-09-03-some-feature.md"), "# a plan a human wrote\n");

  assert.deepEqual(validateTrio({ projectDir: dir }), [], "only a plan with a matching audit or review is a trio plan");
});

test("the docs gate exits non-zero on a broken trio", () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });
  const plan = join(dir, "docs/plans/security.md");
  writeFileSync(plan, readFileSync(plan, "utf8").replace("SEC-1", "SEC-404"));

  const scan = fileURLToPath(new URL("../docs-scan.mjs", import.meta.url));
  const run = spawnSync(process.execPath, [scan], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, RULE_MCP_NO_AUTOUPDATE: "1" },
  });

  assert.equal(run.status, 1, `the gate must fail: ${run.stdout}${run.stderr}`);
  assert.match(run.stdout, /SEC-404/, "and say which finding does not exist");
});

test("one step may close several findings", () => {
  // Found on the first live run: two one-line documentation fixes belong in one
  // step and one commit. Reading the cell as a single id made the plan wrong
  // for describing the work accurately.
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });
  const plan = join(dir, "docs/plans/security.md");
  writeFileSync(plan, `${readFileSync(plan, "utf8")}\n| Step | Fixes | What it takes |\n| --- | --- | --- |\n| 9 | SEC-1, SEC-2 | one commit |\n`);

  assert.deepEqual(validateTrio({ projectDir: dir }), [], "a list of open ids in one cell is not a dangling id");
});

test("a step that names an unknown finding among known ones still fails", () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });
  const plan = join(dir, "docs/plans/security.md");
  writeFileSync(plan, `${readFileSync(plan, "utf8")}\n| Step | Fixes | What it takes |\n| --- | --- | --- |\n| 9 | SEC-1, SEC-404 | one commit |\n`);

  assert.match(
    validateTrio({ projectDir: dir })
      .map((problem) => problem.reason)
      .join(" "),
    /SEC-404/,
    "the unknown one is still named",
  );
});
