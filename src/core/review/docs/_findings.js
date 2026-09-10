

/** @module core/review/docs/findings */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { trioPaths } from "./_paths.js";
import { REVIEW_COLUMNS, splitRow } from "./_table.js";

/** Severity order for the plan's steps: the worst thing first. */
const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];

/** The findings already recorded for a role, as the last run left them. */
export function readFindings({ role, projectDir = "." }) {
  const file = join(projectDir, trioPaths(role).review);

  if (!existsSync(file)) {
    return [];
  }

  const rows = readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trimStart().startsWith("|"));
  const findings = [];

  for (const row of rows) {
    const cells = splitRow(row);

    if (cells.length < REVIEW_COLUMNS.length) {
      continue;
    }

    const [id, severity, status, evidence, summary] = cells;

    // The header and its separator are rows too, and neither is a finding.
    if (id === REVIEW_COLUMNS[0] || /^-{2,}$/.test(id.replaceAll(" ", ""))) {
      continue;
    }

    findings.push({ id, severity, status, evidence, summary });
  }

  return findings;
}

/** Where a severity sits in the order the plan works through them. */
function severityRank(severity) {
  const index = SEVERITY_ORDER.indexOf(String(severity).toLowerCase());

  return index === -1 ? SEVERITY_ORDER.length : index;
}

/**
 * Merge what this run reported into what the last run recorded.
 *
 * Reported means open. A finding the run no longer reports is resolved and kept
 * for one run so a reader can see what closed; the run after that removes it.
 *
 * @param {Array<object>} previous - findings as recorded
 * @param {Array<object>} reported - findings this run found
 * @returns {{findings: Array<object>, counts: {open: number, resolved: number, pruned: number}}}
 */
export function mergeFindings(previous, reported) {
  const reportedById = new Map(reported.map((finding) => [finding.id, finding]));
  const findings = [];
  let resolved = 0;
  let pruned = 0;

  for (const record of previous) {
    const stillReported = reportedById.get(record.id);

    if (stillReported) {
      continue; // it is re-added below, with this run's wording
    }

    if (record.status === "open") {
      findings.push({ ...record, status: "resolved" });
      resolved += 1;
      continue;
    }

    pruned += 1;
  }

  for (const finding of reported) {
    findings.push({
      id: finding.id,
      severity: finding.severity ?? "medium",
      status: "open",
      evidence: finding.evidence ?? "",
      summary: finding.summary ?? "",
      ...(Array.isArray(finding.steps) && finding.steps.length > 0 && { steps: finding.steps }),
    });
  }

  findings.sort((left, right) => {
    const bySeverity = severityRank(left.severity) - severityRank(right.severity);

    return bySeverity === 0 ? left.id.localeCompare(right.id) : bySeverity;
  });

  return { findings, counts: { open: reported.length, resolved, pruned } };
}
