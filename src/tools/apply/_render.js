/** @module tools/apply/render - the rule_tool_apply result envelope */

/**
 * Render the apply outcome, dry-run or written, with the receipt facts.
 *
 * @param {{ dryRun: boolean, receiptCheck: object, rootDir: string, results: object[] }} outcome
 * @returns {object} an MCP tool result
 */
export function renderApplyResult({ dryRun, receiptCheck, rootDir, results }) {
  const lines = [
    `# pix_apply: ${dryRun ? "DRY RUN (preview)" : "FILES WRITTEN"}`,
    "",
    dryRun ? "> This is a preview. Set `dryRun: false` to write files." : "",
    "",
    `Receipt: **valid** ✅ (${receiptCheck.binding === "files" ? "path-bound" : "content-only, single file"})`,
    `Root: \`${rootDir}\``,
    `Files: ${results.length}`,
    "",
    ...results.map(
      (r) =>
        `- ${r.status === "written" ? "✅" : r.status === "dry-run" ? "📋" : "❌"} ${r.path}${r.note ? ` (${r.note})` : ""}${r.error ? ` - ${r.error}` : ""}`,
    ),
    "",
    dryRun
      ? "Run again with `dryRun: false` to apply changes."
      : `Wrote ${results.filter((r) => r.status === "written").length} files.`,
  ].filter(Boolean);

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    _meta: {
      pixApply: {
        receiptValid: true,
        receiptBinding: receiptCheck.binding,
        root: rootDir,
        dryRun: !!dryRun,
        filesWritten: results.filter((r) => r.status === "written").length,
        filesPreviewed: results.filter((r) => r.status === "dry-run").length,
      },
    },
  };
}
