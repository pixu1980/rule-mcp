/** @module core/review/docs/render */

import { REVIEW_COLUMNS, table } from "./_table.js";

/** The header every document of the trio opens with; a scoped run names its scope. */
function header(title, role, version, date, scope) {
  return [`# ${title}`, "", `- **Role**: ${role} v${version}`, `- **Date**: ${date}`, ...(scope ? [`- **Scope**: ${scope}`] : []), ""];
}

/** Render the audit skeleton: header plus the empty evidence table. */
export function renderAudit(role, version, date, scope) {
  return [
    ...header(`${role} audit`, role, version, date, scope),
    "Evidence only: the commands this run executed with their measured values, the files it read,",
    "the sources it consulted. No opinions - those belong in the review.",
    "",
    "## Evidence",
    "",
    ...table(["What was measured", "How", "Result"], []),
    "",
  ].join("\n");
}

/** Render the review: header, provenance note and the findings table. */
export function renderReview(role, version, date, findings, scope) {
  const rows = findings.map((finding) => [finding.id, finding.severity, finding.status, finding.evidence, finding.summary]);

  return [
    ...header(`${role} review`, role, version, date, scope),
    `Findings distilled from [the audit](../audits/${role}.md). A finding this run no longer reports is`,
    "flipped to resolved and kept one run for visibility, then removed.",
    "",
    ...(findings.length > 0 ? table(REVIEW_COLUMNS, rows) : ["No findings: this run found nothing to report."]),
    "",
  ].join("\n");
}

/**
 * Render the plan: header, provenance note and one checkbox per open finding,
 * with a finding's sub-steps nested as `N.M` checkboxes under its step.
 *
 * A checklist rather than a table so an executed step can be marked with `[x]`
 * in place; the sync keeps the mark - step or sub-step - while the finding
 * stays open. Steps are as many as the findings demand: nothing caps the list.
 *
 * @param {string} role @param {number} version @param {string} date
 * @param {Array<object>} open - open findings, worst first; `steps` on a
 *   finding becomes its numbered sub-checkboxes
 * @param {Set<string>} [checked] - marks to keep: a finding id for its step,
 *   `id#M` for its M-th sub-step
 * @param {string} [scope] - the binding scope of a scoped run, for the header
 */
export function renderPlan(role, version, date, open, checked = new Set(), scope) {
  const box = (done) => `- [${done ? "x" : " "}]`;

  return [
    ...header(`${role} plan`, role, version, date, scope),
    `Steps re-derived from the open findings in [the review](../reviews/${role}.md) on every run, worst`,
    "first. Mark an executed step or sub-step with `[x]` - the next sync keeps the mark while its",
    "finding stays open. This file is deleted by the run that finds nothing open.",
    "",
    "## Steps",
    "",
    ...open.flatMap((finding, index) => [
      `${box(checked.has(finding.id))} **Step ${index + 1} - ${finding.id} (${finding.severity})**: ${finding.summary}`,
      ...(finding.steps ?? []).map((sub, subIndex) => `  ${box(checked.has(`${finding.id}#${subIndex + 1}`))} **${index + 1}.${subIndex + 1}**: ${sub}`),
    ]),
    "",
  ].join("\n");
}
