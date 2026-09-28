

/** @module tools/actions/git-render - the rule_tool_git report and proposal text. */

/**
 * The read-only audit.
 *
 * @param {object} audit
 * @param {boolean} force whether `--force` was passed
 * @returns {string}
 */
export function renderAudit(audit, force) {
  const r = audit.range;
  const lines = [
    "# rule_tool_git - audit",
    "",
    `Base branch:       ${r.baseBranch || "(none)"}${r.baseRef ? ` (${r.baseRef})` : ""}`,
    `Merge base:        ${r.mergeBase || "-"}`,
    `Commit range:      ${r.range || "-"}`,
    `Feature commits:   ${r.count}`,
    `CC violations:     ${audit.violations.length}`,
  ];

  for (const violation of audit.violations) {
    lines.push(`  ${violation.short} ${violation.subject}`, `    ${violation.reason}`);
  }

  lines.push(`Merge commits:     ${audit.merges.length}`);

  for (const merge of audit.merges) {
    lines.push(`  ${merge.short} ${merge.subject}`);
  }

  lines.push(`Working tree:      ${audit.safe ? "safe to rewrite" : `NOT safe - ${audit.reasons.join("; ")}`}`);

  if (audit.anomalies.length > 0) {
    lines.push("", "Anomalies:", ...audit.anomalies.map((anomaly) => `  - ${anomaly}`));
  }

  lines.push("", "Next:");

  if (audit.violations.length > 0) {
    lines.push("  - propose a message per violation, then: action=reword confirm=true rewrites=[{sha, message}, ...]");
  }

  if (audit.merges.length > 0) {
    lines.push(
      force
        ? "  - linearize proposal: action=linearize force=true confirm=true (run it only after the user confirms)"
        : "  - re-run with force=true to propose removing the merge commits",
    );
  }

  return lines.join("\n");
}

/**
 * The reword verdict, or the proposed message pairs before confirmation.
 *
 * @param {object} result
 * @returns {string}
 */
export function renderReword(result) {
  const lines = ["# rule_tool_git - reword", ""];

  if (result.applied) {
    const v = result.verification;

    lines.push("Reword applied.", `Feature commits: ${v.commits}`, `CC violations:   ${v.violations}`, `Final tree:      ${v.treeUnchanged ? "unchanged" : "CHANGED"}`);

    return lines.join("\n");
  }

  lines.push(`Not applied: ${result.reason}`);

  const entries = result.proposal?.entries ?? [];

  if (entries.length > 0) {
    lines.push("", "Proposed:");

    for (const entry of entries) {
      lines.push(`  ${entry.short}  OLD -> NEW`);
      lines.push(`    old: ${entry.from}`);
      lines.push(`    new: ${entry.to}${entry.valid ? "" : `  (invalid: ${entry.reason})`}`);
    }
  }

  if (result.output) {
    lines.push("", "git said:", result.output);
  }

  return lines.join("\n");
}

/**
 * The linearize verdict, or the refusal when `--force` was not passed.
 *
 * @param {object} result
 * @returns {string}
 */
export function renderLinearize(result) {
  const lines = ["# rule_tool_git - linearize", ""];

  if (result.applied) {
    const v = result.verification;

    lines.push("Merge commits removed.", `Feature commits: ${v.commits}`, `Merge commits:   ${v.merges}`, `Final tree:      ${v.treeUnchanged ? "unchanged" : "CHANGED"}`);

    return lines.join("\n");
  }

  lines.push(`Not applied: ${result.reason}`);

  if (result.conflicted) {
    lines.push(
      "",
      "Conflicts (the branch was rolled back and left untouched):",
      ...(result.conflicts?.length > 0 ? result.conflicts.map((file) => `  ${file}`) : ["  (git listed none)"]),
      "",
      "Resolve them by hand and re-run, or run the rebase yourself.",
    );
  }

  if (result.output) {
    lines.push("", "git said:", result.output);
  }

  return lines.join("\n");
}
