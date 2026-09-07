/** @module tools/fix/auto-fix - mode=fix: scan and auto-correct */

import { autoFixFileTree } from "../../core/file-tree/index.js";

/**
 * Handle mode=fix.
 *
 * @param {object} arguments_
 * @returns {object} an MCP tool result
 */
export function fixMode(arguments_) {
  const isDryRun = arguments_.dryRun !== false;
  const result = autoFixFileTree(arguments_.path || ".", {
    srcDir: arguments_.srcDir || "src",
    dryRun: isDryRun,
  });

  const lines = [`# File Tree Auto-Fix: ${isDryRun ? "DRY RUN" : "COMPLETE"}`, "", ...(isDryRun ? ["", "> This is a preview. Run with `dryRun=false` to apply fixes.", ""] : [""])];

  if (result.fixed.length > 0) {
    lines.push(`## Fixed (${result.fixed.length})`, "");

    for (const f of result.fixed) {
      lines.push(`- ${f.action}: \`${f.path}\``);
    }

    lines.push("");
  }

  if (result.errors.length > 0) {
    lines.push(`## Errors (${result.errors.length})`, "");

    for (const e of result.errors) {
      lines.push(`- ❌ \`${e.path}\`: ${e.error}`);
    }

    lines.push("");
  }

  if (result.remaining.length > 0) {
    lines.push(`## Remaining Issues (${result.remaining.length})`, "");

    for (const r of result.remaining) {
      lines.push(`- ⚠️ \`${r.path}\`: ${r.message}`);
    }

    lines.push("");
  }

  if (result.fixed.length === 0 && result.errors.length === 0 && result.remaining.length === 0) {
    lines.push("✅ No issues found. File tree is clean.");
  }

  return { content: [{ type: "text", text: lines.join("\n") }] };
}
