/** Review findings: the recorded table read, header/separator skip, ranking. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { readFindings, mergeFindings } from "../_findings.js";

const project = mkdtempSync(join(tmpdir(), "rule-findings-"));
const reviewDir = mkdirSync(join(project, "docs", "reviews"), { recursive: true });

test.after(() => rmSync(project, { recursive: true, force: true }));

test("readFindings parses rows and skips the header, separator and short rows", () => {
  const file = join(project, "docs", "reviews", "security.md");
  mkdirSync(join(project, "docs", "reviews"), { recursive: true });
  writeFileSync(
    file,
    [
      "| Finding | Severity | Status | Evidence | Summary |",
      "|---|---|---|---|---|",
      "| F1 | high | open | audit.md#x | The first finding |",
      "| F2 | medium | resolved | audit.md#y | A short one |",
      "| short row without enough cells |",
      "",
    ].join("\n"),
  );

  const findings = readFindings({ role: "security", projectDir: project });
  assert.equal(findings.length, 2, "the header and separator rows are skipped");
  assert.equal(findings[0].id, "F1", "the id reads");
  assert.equal(findings[0].severity, "high", "the severity reads");
  assert.equal(findings[0].status, "open", "the status reads");

  assert.deepEqual(readFindings({ role: "absent", projectDir: project }), [], "no review file means no findings");
});

test("mergeFindings flips reported-open and keeps resolved ones visible once", () => {
  const prior = [
    { id: "F1", severity: "high", status: "open", evidence: "a", summary: "keep open" },
    { id: "F2", severity: "medium", status: "open", evidence: "b", summary: "now closed" },
  ];
  const now = [
    { id: "F1", severity: "high", status: "open", evidence: "a", summary: "keep open" },
    { id: "F3", severity: "low", status: "open", evidence: "c", summary: "brand new" },
  ];

  const merged = mergeFindings(prior, now).findings;
  assert.ok(merged.some((f) => f.id === "F1" && f.status === "open"), "reported-open stays open");
  assert.ok(merged.some((f) => f.id === "F2" && f.status === "resolved"), "an open finding no longer reported resolves");
  assert.ok(merged.some((f) => f.id === "F3"), "a brand new finding is added");
  const sorted = merged.findIndex((f) => f.id === "F1") < merged.findIndex((f) => f.id === "F3");
  assert.equal(sorted, true, "higher severities sort before lower ones");
});