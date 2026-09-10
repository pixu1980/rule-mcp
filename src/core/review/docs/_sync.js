

/** @module core/review/docs/sync */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { mergeFindings, readFindings } from "./_findings.js";
import { trioPaths } from "./_paths.js";
import { planCheckedIds } from "./_plan-ids.js";
import { renderAudit, renderPlan, renderReview } from "./_render.js";

/** Write a file, creating the directory it lives in. */
function write(projectDir, relative, contents) {
  const file = join(projectDir, relative);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

/**
 * Bring a role's trio in line with what this run found.
 *
 * @param {object} options
 * @param {string} options.role - role id
 * @param {Array<object>} [options.findings] - what this run reported, all open by definition
 * @param {string} [options.projectDir] - project root
 * @param {number} [options.version] - the role's version, for the headers
 * @param {string} [options.date] - the run date; defaults to today
 * @returns {{written: string[], deleted: string[], counts: object, findings: Array<object>}}
 */
export function syncRoleDocs({ role, findings = [], projectDir = ".", version = 1, date } = {}) {
  const paths = trioPaths(role);
  const stamp = date ?? new Date().toISOString().slice(0, 10);
  const merged = mergeFindings(readFindings({ role, projectDir }), findings);
  const open = merged.findings.filter((finding) => finding.status === "open");

  write(projectDir, paths.audit, renderAudit(role, version, stamp));
  write(projectDir, paths.review, renderReview(role, version, stamp, merged.findings));

  const written = [paths.audit, paths.review];
  const deleted = [];
  const planFile = join(projectDir, paths.plan);

  if (open.length > 0) {
    // Marks already made on the checklist survive the re-render: an executed
    // step whose finding is still open stays [x], everything else is re-derived.
    const checked = existsSync(planFile) ? planCheckedIds(readFileSync(planFile, "utf8")) : new Set();

    write(projectDir, paths.plan, renderPlan(role, version, stamp, open, checked));
    written.push(paths.plan);
  } else if (existsSync(planFile)) {
    rmSync(planFile);
    deleted.push(paths.plan);
  }

  return { written, deleted, counts: merged.counts, findings: merged.findings };
}
