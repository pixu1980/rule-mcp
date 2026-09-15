/** Handoff section for the semantic working-tree summary, from the TokenSave graph. */

/**
 * The semantic working-tree summary, full format only.
 *
 * @param {{ commit?: object, diff?: object, history?: object }|null} changes
 * @param {{ isMinimal: boolean, isBrief: boolean }} shape
 * @returns {string[]}
 */
export function semanticLines(changes, { isMinimal, isBrief }) {
  if (!changes || isMinimal || isBrief) {
    return [];
  }

  const lines = ["### Semantic Changes (TokenSave)", ""];

  if (changes.commit?.message) {
    lines.push(`- Summary: ${changes.commit.message}`);
  }

  const commitFiles = changes.commit?.changed_files?.length ?? 0;
  const roles = Object.keys(changes.commit?.symbols_by_role ?? {});

  if (commitFiles > 0 && !changes.diff) {
    lines.push(`- Changed files: ${commitFiles}${roles.length > 0 ? ` (${roles.join(", ")})` : ""}`);
  }

  if (changes.diff) {
    const files = changes.diff.changed_files?.length ?? 0;
    const modified = changes.diff.modified_symbols?.length ?? 0;
    const impacted = changes.diff.impacted_symbols_count ?? changes.diff.impacted_symbols?.length ?? 0;
    const tests = changes.diff.affected_tests?.length ?? 0;

    lines.push(`- Changed files: ${files}`, `- Modified symbols: ${modified}`, `- Impacted symbols: ${impacted}`, `- Affected tests: ${tests}`);
  }

  if (changes.history?.events?.length > 0) {
    lines.push(`- History for \`${changes.history.symbol}\`:`);

    for (const event of changes.history.events.slice(0, 3)) {
      lines.push(`  - ${String(event.short_sha ?? event.commit).slice(0, 7)} ${event.summary}`);
    }
  }

  lines.push("");

  return lines;
}
