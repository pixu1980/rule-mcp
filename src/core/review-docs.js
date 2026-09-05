/**
 * @module core/review-docs
 *
 * The bookkeeping half of a review persona's run (personas C.2).
 *
 * One invocation owns three documents with stable per-role paths - the audit is
 * a snapshot and is overwritten, the review accumulates findings and flips them
 * as they close, the plan is re-derived from what is still open and disappears
 * when nothing is. Those rules are mechanical, and a rule that is mechanical and
 * still left to model discipline is a rule that holds until the run that forgets
 * it. A review whose statuses have drifted is worse than no review, because it
 * is read as current.
 *
 * So this module writes the skeletons and does the merging; the agent writes the
 * evidence, the wording of the findings and the substance of the steps. Nothing
 * here calls a model, and the same inputs always produce the same files.
 *
 * @see module:tools/plan-docs - the rule_tool_plan_docs tool over it
 * @see module:core/review-roles - where a role and its version come from
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Severity order for the plan's steps: the worst thing first. */
const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];

/** The columns of the review table, in the order they are written and read. */
const REVIEW_COLUMNS = ["Finding", "Severity", "Status", "Evidence", "Summary"];

/**
 * Where each document of the trio lives for a role.
 *
 * @param {string} role - role id
 * @returns {{audit: string, review: string, plan: string}} repo-relative paths
 */
export function trioPaths(role) {
  return {
    audit: `docs/audits/${role}.md`,
    review: `docs/reviews/${role}.md`,
    plan: `docs/plans/${role}.md`,
  };
}

/** A pipe would end the cell it sits in, so it travels escaped. */
function escapeCell(value) {
  return String(value ?? "")
    .replaceAll("\\", String.raw`\\`)
    .replaceAll("|", String.raw`\|`)
    .replaceAll(/\r?\n/g, " ")
    .trim();
}

/** The inverse of {@link escapeCell}. */
function unescapeCell(value) {
  return value
    .replaceAll(String.raw`\|`, "|")
    .replaceAll("\\\\", "\\")
    .trim();
}

/**
 * Split one markdown table row into its cells, respecting escaped pipes.
 *
 * @param {string} line
 * @returns {string[]}
 */
function splitRow(line) {
  const cells = [];
  let current = "";
  let index = 0;

  const body = line.trim().replace(/^\|/, "").replace(/\|$/, "");

  while (index < body.length) {
    const char = body[index];

    if (char === "\\" && index + 1 < body.length) {
      current += char + body[index + 1];
      index += 2;
      continue;
    }

    if (char === "|") {
      cells.push(current);
      current = "";
      index += 1;
      continue;
    }

    current += char;
    index += 1;
  }

  cells.push(current);

  return cells.map((cell) => unescapeCell(cell));
}

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
 * The finding ids a plan's steps point at, in the order they appear.
 *
 * A step may close more than one finding - two one-line documentation fixes
 * belong in one step and one commit - so the cell is read as a list. Anything
 * that is not shaped like an id, a dash for "nothing" among them, is ignored
 * rather than reported as dangling.
 *
 * @param {string} plan
 * @returns {string[]}
 */
function planFindingIds(plan) {
  const ids = [];

  for (const line of plan.split("\n")) {
    if (!line.trimStart().startsWith("|")) {
      continue;
    }

    const cells = splitRow(line);

    // | Step | Finding(s) | ... |
    if (cells.length < 3 || cells[0] === "Step" || !/^\d+$/.test(cells[0].trim())) {
      continue;
    }

    for (const part of cells[1].split(",")) {
      const id = part.trim();

      if (/^[A-Za-z][\w-]*-\d+$/.test(id)) {
        ids.push(id);
      }
    }
  }

  return ids;
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
function mergeFindings(previous, reported) {
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
    });
  }

  findings.sort((left, right) => {
    const bySeverity = severityRank(left.severity) - severityRank(right.severity);

    return bySeverity === 0 ? left.id.localeCompare(right.id) : bySeverity;
  });

  return { findings, counts: { open: reported.length, resolved, pruned } };
}

/** Where a severity sits in the order the plan works through them. */
function severityRank(severity) {
  const index = SEVERITY_ORDER.indexOf(String(severity).toLowerCase());

  return index === -1 ? SEVERITY_ORDER.length : index;
}

/** The header every document of the trio opens with. */
function header(title, role, version, date) {
  return [`# ${title}`, "", `- **Role**: ${role} v${version}`, `- **Date**: ${date}`, ""];
}

/** One markdown table, header row included. */
function table(columns, rows) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => escapeCell(cell)).join(" | ")} |`),
  ];
}

function renderAudit(role, version, date) {
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

function renderReview(role, version, date, findings) {
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

function renderPlan(role, version, date, open) {
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
    write(projectDir, paths.plan, renderPlan(role, version, stamp, open));
    written.push(paths.plan);
  } else if (existsSync(planFile)) {
    rmSync(planFile);
    deleted.push(paths.plan);
  }

  return { written, deleted, counts: merged.counts, findings: merged.findings };
}
