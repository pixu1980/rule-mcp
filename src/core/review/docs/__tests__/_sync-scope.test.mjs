

/** Scoped sync: the scope lands in the headers and out-of-scope findings survive. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { syncRoleDocs } from "../_sync.js";

const project = mkdtempSync(join(tmpdir(), "rule-sync-scope-"));

test.after(() => rmSync(project, { recursive: true, force: true }));

test("a scoped sync records the scope and keeps out-of-scope findings open", () => {
  mkdirSync(join(project, "docs", "reviews"), { recursive: true });
  writeFileSync(
    join(project, "docs", "reviews", "security.md"),
    ["| Finding | Severity | Status | Evidence | Summary |", "|---|---|---|---|---|", "| F1 | high | open | audit.md#x | An out-of-scope finding |", ""].join("\n"),
  );

  const result = syncRoleDocs({
    role: "security",
    findings: [{ id: "F2", severity: "low", summary: "An in-scope finding" }],
    projectDir: project,
    scope: "the CLI output",
  });

  assert.equal(result.counts.resolved, 0, "a scoped run resolves nothing it did not look at");
  assert.equal(result.counts.open, 2, "both findings stay open");

  const review = readFileSync(join(project, "docs", "reviews", "security.md"), "utf8");
  assert.match(review, /\| F1 \| high \| open \|/, "the out-of-scope finding stays open");
  assert.match(review, /F2/, "the in-scope finding is recorded");
  assert.match(review, /\*\*Scope\*\*: the CLI output/, "the review header states the scope");

  const audit = readFileSync(join(project, "docs", "audits", "security.md"), "utf8");
  assert.match(audit, /\*\*Scope\*\*: the CLI output/, "the audit header states the scope");

  const plan = readFileSync(join(project, "docs", "plans", "security.md"), "utf8");
  assert.match(plan, /\*\*Scope\*\*: the CLI output/, "the plan header states the scope");
});

test("an unscoped sync writes no scope line and keeps the flip semantics", () => {
  const box = mkdtempSync(join(tmpdir(), "rule-sync-plain-"));

  try {
    const result = syncRoleDocs({
      role: "security",
      findings: [{ id: "F1", severity: "low", summary: "A finding" }],
      projectDir: box,
    });

    assert.equal(result.counts.open, 1);
    const audit = readFileSync(join(box, "docs", "audits", "security.md"), "utf8");
    assert.ok(!audit.includes("**Scope**"), "no scope line without a scope");
  } finally {
    rmSync(box, { recursive: true, force: true });
  }
});
