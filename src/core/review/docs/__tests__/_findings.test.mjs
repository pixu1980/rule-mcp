/** Review findings: the recorded table read, header/separator skip, ranking. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { readFindings, mergeFindings } from "../_findings.js";

const project = mkdtempSync(join(tmpdir(), "rule-mcp-findings-"));
mkdirSync(join(project, "docs", "reviews"), { recursive: true });

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
  assert.ok(
    merged.some((f) => f.id === "F1" && f.status === "open"),
    "reported-open stays open",
  );
  assert.ok(
    merged.some((f) => f.id === "F2" && f.status === "resolved"),
    "an open finding no longer reported resolves",
  );
  assert.ok(
    merged.some((f) => f.id === "F3"),
    "a brand new finding is added",
  );
  const sorted = merged.findIndex((f) => f.id === "F1") < merged.findIndex((f) => f.id === "F3");
  assert.equal(sorted, true, "higher severities sort before lower ones");
});

test("mergeFindings prunes stale resolved rows, defaults sparse fields and keeps steps", () => {
  const prior = [{ id: "F9", severity: "low", status: "resolved", evidence: "", summary: "seen once already" }];
  const now = [
    { id: "FA", steps: ["fix the thing"] },
    { id: "FB", severity: "unheard-of" },
    { id: "FC", severity: "unheard-of" },
  ];

  const { findings, counts } = mergeFindings(prior, now);
  assert.equal(counts.pruned, 1, "a resolved finding not reported again is pruned");
  assert.equal(counts.open, 3, "everything reported counts as open");

  const sparse = findings.find((f) => f.id === "FA");
  assert.equal(sparse.severity, "medium", "a missing severity defaults to medium");
  assert.equal(sparse.evidence, "", "a missing evidence defaults to empty");
  assert.deepEqual(sparse.steps, ["fix the thing"], "reported steps survive the merge");

  const unknownRank = findings.findIndex((f) => f.id === "FB");
  assert.ok(unknownRank > findings.findIndex((f) => f.id === "FA"), "an unknown severity ranks after the known ones");
  assert.ok(findings.findIndex((f) => f.id === "FB") < findings.findIndex((f) => f.id === "FC"), "equal severities tie-break by id");
});

test("a scoped merge leaves unreported findings untouched", () => {
  const prior = [
    { id: "F1", severity: "high", status: "open", evidence: "a", summary: "outside the scope" },
    { id: "F2", severity: "medium", status: "resolved", evidence: "b", summary: "closed last run" },
  ];
  const now = [{ id: "F3", severity: "low", status: "open", evidence: "c", summary: "inside the scope" }];

  const scoped = mergeFindings(prior, now, { preserveUnreported: true });
  assert.ok(
    scoped.findings.some((f) => f.id === "F1" && f.status === "open"),
    "an open finding outside the scope stays open, not resolved",
  );
  assert.ok(
    scoped.findings.some((f) => f.id === "F2" && f.status === "resolved"),
    "a resolved finding outside the scope is not pruned",
  );
  assert.equal(scoped.counts.resolved, 0, "a scoped run resolves nothing it did not look at");
  assert.equal(scoped.counts.pruned, 0, "a scoped run prunes nothing");
  assert.equal(scoped.counts.open, 2, "open counts what is open after the merge");
});
