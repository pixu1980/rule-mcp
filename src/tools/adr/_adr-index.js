/** The generated docs/adr/ADR.md index: tables, themes, and the rewrite. */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ADR_INDEX_FILE, adrFilename } from "./_files.js";

/** Tags carried by this many decisions form a theme section in the index. */
export const THEME_THRESHOLD = 3;

/**
 * Rendered ADR index as text, the shape the docs-numbering tool rewrites.
 *
 * @param {Array<{ file?: string, number: number, title: string, date?: string, status: string, tags?: string[] }>} entries
 * @returns {string}
 */
export function buildAdrIndex(entries) {
  const sorted = [...entries].sort((a, b) => b.number - a.number);
  const label = (entry) => String(entry.number).padStart(3, "0");
  const link = (entry) => `[${label(entry)}](${entry.file || adrFilename(entry.number, entry.title)})`;

  const lines = [
    "# Architecture Decision Records",
    "",
    "Every decision this project has taken, newest first. The numbered files in",
    "this directory are the source of truth; this index is generated from them by",
    "`rule_tool_process_adr`, so editing it by hand is work the next call throws away.",
    "",
    "## Index",
    "",
    "| # | Title | Date | Status | Tags |",
    "|---|-------|------|--------|------|",
    ...sorted.map((entry) => `| ${link(entry)} | ${entry.title} | ${entry.date || "-"} | ${entry.status} | ${entry.tags.join(", ") || "-"} |`),
    "",
    "## What each decision says",
    "",
    "The opening sentence of each decision and of what it cost, lifted from the",
    "file. Where a line stops short the rest is in the ADR.",
    "",
    "| ADR | Decision | Consequence |",
    "|-----|----------|-------------|",
    ...sorted.map((entry) => `| ${link(entry)} | ${entry.decision || "-"} | ${entry.consequence || "-"} |`),
    "",
    "## By theme",
    "",
  ];

  const counts = new Map();

  for (const entry of entries) {
    for (const tag of entry.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const themes = [...counts]
    .filter(([, count]) => count >= THEME_THRESHOLD)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);

  lines.push(
    `Tags carried by ${THEME_THRESHOLD} or more decisions. A decision appears under every`,
    "theme it carries, and the early ADRs that predate the tag field are listed last.",
    "",
  );

  for (const theme of themes) {
    const members = sorted.filter((entry) => entry.tags.includes(theme));
    lines.push(`### ${theme}`, "", ...members.map((entry) => `- ${link(entry)} ${entry.title}`), "");
  }

  const untagged = sorted.filter((entry) => entry.tags.length === 0);

  if (untagged.length > 0) {
    lines.push("### no tags", "", ...untagged.map((entry) => `- ${link(entry)} ${entry.title}`), "");
  }

  lines.push(
    "## Operating rules",
    "",
    "- Record a structural decision with `rule_tool_process_adr`, when it is taken.",
    "- Never rewrite an accepted decision. Supersede it with a new one that says why.",
    "- Never edit this file. Edit the ADR and let the next call regenerate it.",
    "",
  );

  return lines.join("\n");
}

/** Write the ADR index. */
export function updateAdrIndex(adrDir, entries) {
  writeFileSync(join(adrDir, ADR_INDEX_FILE), buildAdrIndex(entries));
}
