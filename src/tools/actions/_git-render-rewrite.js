

/** @module tools/actions/git-render-rewrite - the rule_tool_git squash and linearize text. */

/**
 * The squash verdict, or the pre-close plan before confirmation.
 *
 * @param {object} result
 * @returns {string}
 */
export function renderSquash(result) {
  if (result.applied) {
    const v = result.verification;

    return [
      "# rule_tool_git - squash",
      "",
      "Feature squashed into one commit.",
      `Message:         ${result.message}`,
      `Feature commits: ${v.commits}`,
      `Final tree:      ${v.treeUnchanged ? "unchanged" : "CHANGED"}`,
      `Working tree:    ${v.workingTree}`,
    ].join("\n");
  }

  const proposal = result.proposal ?? {};
  const range = proposal.range ?? {};
  const lines = [
    "# rule_tool_git - squash",
    "",
    `Not applied: ${result.reason}`,
    "",
    `Base branch:     ${range.baseBranch || "(none)"}${range.baseRef ? ` (${range.baseRef})` : ""}`,
    `Merge base:      ${range.mergeBase || "-"}`,
    `Commit range:    ${range.range || "-"}`,
    `Feature commits: ${range.count ?? 0}`,
    `Message valid:   ${result.verdict?.valid ? "yes" : `no - ${result.verdict?.reason ?? "not provided"}`}`,
  ];

  if ((proposal.commits ?? []).length > 0) {
    lines.push("", "Commits being squashed:", ...proposal.commits.map((commit) => `  ${commit.short} ${commit.subject}`));
  }

  if (proposal.safe === false) {
    lines.push("", `Working tree NOT safe - ${(proposal.reasons ?? []).join("; ")}`);
  }

  lines.push("", 'Confirm with: action=squash confirm=true message="type(scope): feature summary"');

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
