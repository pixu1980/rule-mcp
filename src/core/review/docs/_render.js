/** @module core/review/docs/render */

import { REVIEW_COLUMNS, table } from "./_table.js";

/** The header every document of the trio opens with. */
function header(title, role, version, date) {
  return [`# ${title}`, "", `- **Role**: ${role} v${version}`, `- **Date**: ${date}`, ""];
}

/** Render the audit skeleton: header plus the empty evidence table. */
export function renderAudit(role, version, date) {
  return [
    ...header(`${role} audit`, role, version, date),
    "Evidence only: the commands this run executed with their measured values, the files it read,",
    "the sources it consulted. No opinions - those belong in the review.",
    "",
    "## Evidence",
    "",
    "| What was measured | How | Result |",
    "| --- | --- | --- |",
    "",
  ].join("\n");
}

/** Render the review: header, provenance note and the findings table. */
export function renderReview(role, version, date, findings) {
  const rows = findings.map((finding) => [
    finding.id,
    finding.severity,
    finding.status,
    finding.evidence,
    finding.summary,
  ]);

  return [
    ...header(`${role} review`, role, version, date),
    `Findings distilled from [the audit](../audits/${role}.md). A finding this run no longer reports is`,
    "flipped to resolved and kept one run for visibility, then removed.",
    "",
    ...(findings.length > 0 ? table(REVIEW_COLUMNS, rows) : ["No findings: this run found nothing to report."]),
    "",
  ].join("\n");
}

/** Render the plan: header, provenance note and one step per open finding. */
export function renderPlan(role, version, date, open) {
  const rows = open.map((finding, index) => [String(index + 1), finding.id, finding.severity, finding.summary]);

  return [
    ...header(`${role} plan`, role, version, date),
    `Steps re-derived from the open findings in [the review](../reviews/${role}.md) on every run, worst`,
    "first. This file is deleted by the run that finds nothing open.",
    "",
    ...table(["Step", "Finding", "Severity", "What it takes"], rows),
    "",
  ].join("\n");
}
