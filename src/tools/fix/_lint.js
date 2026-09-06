/** @module tools/fix/lint - mode=lint: scan and report */

import { scanFileTree } from "../../core/file-tree/index.js";

/**
 * Handle mode=lint.
 *
 * @param {object} arguments_
 * @returns {object} an MCP tool result
 */
export function lintMode(arguments_) {
        const report = scanFileTree(arguments_.path || ".", { srcDir: arguments_.srcDir || "src" });

  if (report.pass) {
    return {
      content: [
        {
          type: "text",
          text: `# File Tree Validation: PASS\n\n✅ No issues found. Scanned ${report.stats.totalFiles} files in ${report.stats.totalDirs} directories.`,
        },
      ],
    };
  }

  const lines = [
    `# File Tree Validation: ${report.issues.length} issues`,
    "",
    `Scanned: ${report.stats.totalFiles} files, ${report.stats.totalDirs} directories`,
    "",
    "## Summary",
    `- Missing barrel files: ${report.stats.missingBarrel}`,
    `- Wrong file prefix: ${report.stats.wrongPrefix}`,
    `- Bare component files: ${report.stats.bareFiles}`,
    `- Fixable: ${report.stats.fixable}/${report.issues.length}`,
    "",
    "## Issues",
    "",
  ];

  for (const issue of report.issues) {
    const icon = issue.fixable ? "🔧" : "⚠️";

    lines.push(`### ${icon} ${issue.type}`, `**Path**: \`${issue.path}\``, `**Message**: ${issue.message}`);

    if (issue.fixAction) {
      lines.push(`**Auto-fix**: ${issue.fixAction}`);
    }

    lines.push("");
  }

  lines.push("---");

  if (report.stats.fixable > 0) {
    lines.push(`Run with \`mode=fix dryRun=false\` to auto-fix ${report.stats.fixable} issues.`);
  }

  return { content: [{ type: "text", text: lines.join("\n") }] };
}
