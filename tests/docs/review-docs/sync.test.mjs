/** The merge rules: written, read back, flipped, pruned, deleted, re-derived. */
import { strict as assert } from "node:assert";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { FINDINGS, project, read, readFindings, syncRoleDocs } from "./_trio.fixture.mjs";

test("a first run writes the three documents", () => {
  const dir = project();
  const result = syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });

  assert.deepEqual(result.written.sort(), ["docs/audits/security.md", "docs/plans/security.md", "docs/reviews/security.md"], "the trio is written on the first run");
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
