/** The auto-ADR hook: log significant tool calls as lightweight ADR entries. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { addAfterToolHook } from "../router/index.js";
import { ADR_DIR, slugify, nextAdrNumber, listExistingAdrs } from "./_files.js";
import { updateAdrIndex } from "./_adr-index.js";
import { autoLogFields } from "./_auto-log-fields.js";

/**
 * Auto-create an ADR after significant tool calls.
 * Summary-level: title + context only, no full decision.
 */
export async function autoLog(toolName, arguments_, result) {
  const testProcess = process.argv.some((argument) => /(?:^|[\\/])test[\\/]/.test(argument));

  if (process.env.RULE_MCP_DISABLE_AUTO_ADR === "1" || process.env.NODE_ENV === "test" || testProcess) {
    return;
  }

  const relevant = ["pix_tool", "rule_tool_scaffold", "rule_tool_detect", "rule_tool_fix"];

  if (!relevant.includes(toolName)) {
    return;
  }

  const projectDir = arguments_.projectDir || ".";
  const adrDir = join(projectDir, ADR_DIR);
  mkdirSync(adrDir, { recursive: true });

  const number = nextAdrNumber(adrDir);
  const now = new Date().toISOString();
  const dateString = now.slice(0, 10);
  const timeString = now.slice(11, 19);
  const { title, tags, contextLines, decisionLines } = autoLogFields(toolName, arguments_, result);

  const content = [
    `# ${String(number).padStart(3, "0")}: ${title}`,
    "",
    `- **Date**: ${dateString} ${timeString}`,
    `- **Status**: accepted`,
    `- **Tags**: ${tags}`,
    "- **Author**: rule-mcp",
    "",
    "## Context",
    "",
    ...contextLines,
    "",
    "## Decision",
    "",
    ...decisionLines,
    "",
    "## Consequences",
    "",
    "None - informational entry.",
    "",
  ].join("\n");

  const filename = `${String(number).padStart(3, "0")}-${slugify(title.slice(0, 60))}.md`;
  writeFileSync(join(adrDir, filename), content);

  const existing = listExistingAdrs(adrDir);

  updateAdrIndex(adrDir, existing);
}

/** Wire the auto-ADR hook. Disabled by default; enable with RULE_MCP_AUTO_ADR=1. */
export function registerAutoAdrHook() {
  if (process.env.RULE_MCP_AUTO_ADR === "1") {
    addAfterToolHook("*", autoLog);
  }
}
