/**
 * Personas C.2: the trio's bookkeeping is deterministic.
 *
 * A persona run owns three documents - audit, review, plan - with rules about
 * which is overwritten, which is merged, which is deleted. Left to the model
 * those rules hold until the run that forgets one, and a review whose statuses
 * drift is worse than no review. So the mechanical half is code: the helper
 * writes the skeletons, merges the findings, flips and prunes the statuses, and
 * deletes the plan when nothing is open. The agent still writes the content.
 *
 * The round trip is the point of this suite: what the helper writes on one run
 * is what it must be able to read on the next.
 */
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const { readFindings, syncRoleDocs, validateTrio } = await import("../../src/core/review/_docs.js");

/** A project of its own for each case: these tests write files. */
function project() {
  const dir = mkdtempSync(join(tmpdir(), "rule-trio-"));
  mkdirSync(join(dir, ".git"), { recursive: true });

  return dir;
}

const FINDINGS = [
  { id: "SEC-1", severity: "high", summary: "Token expiry compares with < instead of <=" },
  { id: "SEC-2", severity: "medium", summary: "Rate limit counts by token, not by remote" },
];

const read = (dir, path) => readFileSync(join(dir, path), "utf8");

test("a first run writes the three documents", () => {
  const dir = project();
  const result = syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });

  assert.deepEqual(
    result.written.sort(),
    ["docs/audits/security.md", "docs/plans/security.md", "docs/reviews/security.md"],
    "the trio is written on the first run",
  );
  assert.match(read(dir, "docs/reviews/security.md"), /SEC-1/, "the review lists the findings");
  assert.match(read(dir, "docs/plans/security.md"), /SEC-1/, "the plan derives its steps from them");
  assert.equal(result.counts.open, 2);
});

test("what one run writes, the next run reads back", () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });

  const parsed = readFindings({ role: "security", projectDir: dir });
  assert.deepEqual(
    parsed.map((finding) => [finding.id, finding.severity, finding.status]),
    [
      ["SEC-1", "high", "open"],
      ["SEC-2", "medium", "open"],
    ],
    "the review table round-trips",
  );
});

test("a summary with a pipe in it survives the table", () => {
  const dir = project();
  syncRoleDocs({
    role: "security",
    findings: [{ id: "SEC-9", severity: "low", summary: "grep | wc -l reports 12 hits" }],
    projectDir: dir,
  });

  const [finding] = readFindings({ role: "security", projectDir: dir });
  assert.equal(finding.summary, "grep | wc -l reports 12 hits", "a pipe is escaped on the way out and back");
});

test("a finding the next run no longer reports is flipped to resolved, then pruned", () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });

  const second = syncRoleDocs({ role: "security", findings: [FINDINGS[0]], projectDir: dir });
  assert.equal(second.counts.resolved, 1, "the finding that stopped being reported is resolved");
  assert.deepEqual(
    readFindings({ role: "security", projectDir: dir }).map((finding) => [finding.id, finding.status]),
    [
      ["SEC-1", "open"],
      ["SEC-2", "resolved"],
    ],
    "it is kept one run for visibility",
  );

  const third = syncRoleDocs({ role: "security", findings: [FINDINGS[0]], projectDir: dir });
  assert.equal(third.counts.pruned, 1, "and removed on the run after that");
  assert.deepEqual(
    readFindings({ role: "security", projectDir: dir }).map((finding) => finding.id),
    ["SEC-1"],
  );
});

test("a run with nothing open deletes the plan and keeps the audit and review", () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });

  const clean = syncRoleDocs({ role: "security", findings: [], projectDir: dir });
  assert.deepEqual(clean.deleted, ["docs/plans/security.md"], "the plan goes when there is nothing to plan");
  assert.equal(existsSync(join(dir, "docs/plans/security.md")), false);
  assert.ok(existsSync(join(dir, "docs/audits/security.md")), "the audit stays");
  assert.match(read(dir, "docs/reviews/security.md"), /resolved/, "the review says what was closed");
});

test("the audit is a snapshot of now, so it is overwritten", () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });
  writeFileSync(join(dir, "docs/audits/security.md"), "# stale evidence from the last run\n");

  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });
  assert.doesNotMatch(read(dir, "docs/audits/security.md"), /stale evidence/, "last run's evidence does not linger");
  assert.match(read(dir, "docs/audits/security.md"), /security v1/, "the header names the role and its version");
});

test("the plan is re-derived, not appended to", () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });
  syncRoleDocs({ role: "security", findings: [FINDINGS[1]], projectDir: dir });

  const plan = read(dir, "docs/plans/security.md");
  assert.match(plan, /SEC-2/, "the open finding has a step");
  assert.doesNotMatch(plan, /SEC-1/, "the resolved one does not");
});

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

  const scan = fileURLToPath(new URL("docs-scan.mjs", import.meta.url));
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
  writeFileSync(
    plan,
    `${readFileSync(plan, "utf8")}\n| Step | Fixes | What it takes |\n| --- | --- | --- |\n| 9 | SEC-1, SEC-2 | one commit |\n`,
  );

  assert.deepEqual(validateTrio({ projectDir: dir }), [], "a list of open ids in one cell is not a dangling id");
});

test("a step that names an unknown finding among known ones still fails", () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });
  const plan = join(dir, "docs/plans/security.md");
  writeFileSync(
    plan,
    `${readFileSync(plan, "utf8")}\n| Step | Fixes | What it takes |\n| --- | --- | --- |\n| 9 | SEC-1, SEC-404 | one commit |\n`,
  );

  assert.match(
    validateTrio({ projectDir: dir })
      .map((problem) => problem.reason)
      .join(" "),
    /SEC-404/,
    "the unknown one is still named",
  );
});
