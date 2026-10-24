/** @module core/review/docs/validate */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readFindings } from "./_findings.js";
import { trioPaths } from "./_paths.js";
import { planFindingIds } from "./_plan-ids.js";

/** Markdown file names in a directory, or nothing when it does not exist. */
function markdownIn(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);
}

/** A file's contents, or undefined when it is not there. */
function read(projectDir, relative) {
  const file = join(projectDir, relative);

  return existsSync(file) ? readFileSync(file, "utf8") : undefined;
}

/**
 * Reviews imported from the released line as audit records. The plan-graph
 * review predates the trio contract and its plan lives on feat/evolution only;
 * the release line has no audit or plan to pair it with.
 */
const HISTORICAL_ROLES = new Set(["plan-graph"]);

/**
 * Check every trio in a project against the contract (personas C.3).
 *
 * The helper writes documents that satisfy this by construction; the gate is
 * here for the hand edit, the bad merge and the run that wrote the trio without
 * the helper. It answers three questions: does each document say when it was
 * written and for which role, does each one still point at the one it was
 * derived from, and does every step in a plan name a finding the review actually
 * has open. The last is what catches a plan quietly outliving its findings.
 *
 * A role is a document under docs/audits or docs/reviews. A file in docs/plans
 * with no matching audit or review is somebody's ordinary plan and is left
 * alone, which is why the roles are discovered from those two directories.
 *
 * @param {object} [options]
 * @param {string} [options.projectDir] - project root
 * @returns {Array<{file: string, reason: string}>} empty when the trio is sound
 */
export function validateTrio({ projectDir = "." } = {}) {
  const problems = [];
  const roles = new Set();

  for (const kind of ["audits", "reviews"]) {
    for (const name of markdownIn(join(projectDir, "docs", kind))) {
      roles.add(name.replace(/\.md$/, ""));
    }
  }

  for (const role of [...roles].sort()) {
    if (HISTORICAL_ROLES.has(role)) {
      continue;
    }

    const paths = trioPaths(role);
    const audit = read(projectDir, paths.audit);
    const review = read(projectDir, paths.review);
    const plan = read(projectDir, paths.plan);

    for (const [path, contents] of [
      [paths.audit, audit],
      [paths.review, review],
      [paths.plan, plan],
    ]) {
      if (contents === undefined) {
        continue;
      }

      if (!/^- \*\*Date\*\*: \d{4}-\d{2}-\d{2}$/m.test(contents)) {
        problems.push({
          file: path,
          reason: "no `- **Date**: YYYY-MM-DD` header, so nothing says whether it is current",
        });
      }

      if (!new RegExp(String.raw`^- \*\*Role\*\*: ${role} v\d+$`, "m").test(contents)) {
        problems.push({ file: path, reason: `no \`- **Role**: ${role} v<version>\` header` });
      }
    }

    if (review !== undefined && audit === undefined) {
      problems.push({ file: paths.review, reason: `findings with no audit at ${paths.audit} to check them against` });
    }

    if (review !== undefined && !review.includes(`../audits/${role}.md`)) {
      problems.push({
        file: paths.review,
        reason: `no link to the audit it was distilled from (../audits/${role}.md)`,
      });
    }

    if (plan === undefined) {
      continue;
    }

    if (review === undefined) {
      problems.push({ file: paths.plan, reason: `steps with no review at ${paths.review} to derive them from` });
      continue;
    }

    if (!plan.includes(`../reviews/${role}.md`)) {
      problems.push({ file: paths.plan, reason: `no link to the review it was derived from (../reviews/${role}.md)` });
    }

    const open = new Set(
      readFindings({ role, projectDir })
        .filter((finding) => finding.status === "open")
        .map((finding) => finding.id),
    );

    if (open.size === 0) {
      problems.push({
        file: paths.plan,
        reason: "a plan for a review with nothing open: the run should have deleted it",
      });
    }

    for (const id of planFindingIds(plan)) {
      if (!open.has(id)) {
        problems.push({ file: paths.plan, reason: `step for ${id}, which the review does not have open` });
      }
    }
  }

  return problems;
}
