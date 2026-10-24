

/**
 * @module tools/handoff/index
 *
 * The generated `docs/handoff/HANDOFF.md`: one row per handoff document.
 *
 * The numbered files are the source of truth; the index is derived from them,
 * so only the doctor writes it. Handoff headings drifted through three shapes
 * (`NN - topic`, `Session handoff NN - topic`, `Handoff: topic`) before the
 * format settled, and the index reads all three rather than rewriting history.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { renderTable } from "../../core/text/_markdown-table.js";

/** The generated index sitting beside the numbered handoffs. */
export const HANDOFF_INDEX_FILE = "HANDOFF.md";

/** A handoff file: a number, a slug, and nothing else. */
const NUMBERED = /^(\d{2,4})-(.+)\.md$/;

/** The H1 with its numbering prefix stripped down to the topic. */
function titleOf(content, slug) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1] ?? "";
  const title = heading
    .replace(/^Session handoff\s+\d+\s*[\u2014\u2013:-]\s*/i, "")
    .replace(/^Handoff:\s*/i, "")
    .replace(/^\d+\s*[\u2014\u2013:-]\s*/, "")
    .trim();

  return title || slug.replaceAll("-", " ");
}

/** The date a handoff stamps on itself, or "". */
function dateOf(content) {
  const line = content.match(/^.*\bDate\b.*$/m)?.[0] ?? "";

  return line.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
}

/** The branch a handoff names, without the parenthesised aside. */
function branchOf(content) {
  const line = content.match(/^.*\bBranch\b.*$/m)?.[0] ?? "";

  return line
    .replace(/^[*-]?\s*\*{0,2}Branch\*{0,2}[:]\*{0,2}\s*/i, "")
    .replaceAll(/[`*]/g, "")
    .split(" (", 1)[0]
    .trim();
}

/**
 * Every numbered handoff in a directory, newest first.
 *
 * @param {string} handoffDir
 * @returns {Array<{ file: string, number: number, title: string, date: string, branch: string }>}
 */
export function listExistingHandoffs(handoffDir) {
  try {
    return readdirSync(handoffDir)
      .flatMap((name) => {
        const match = NUMBERED.exec(name);

        if (!match) {
          return [];
        }

        const content = readFileSync(join(handoffDir, name), "utf8");

        return [
          {
            file: name,
            number: Number(match[1]),
            title: titleOf(content, match[2]),
            date: dateOf(content),
            branch: branchOf(content),
          },
        ];
      })
      .sort((left, right) => right.number - left.number);
  } catch {
    return [];
  }
}

/**
 * The rendered index, newest first.
 *
 * @param {ReturnType<typeof listExistingHandoffs>} entries
 * @returns {string}
 */
export function buildHandoffIndex(entries) {
  const sorted = [...entries].sort((left, right) => right.number - left.number);
  const link = (entry) => `[${String(entry.number).padStart(2, "0")}](${entry.file})`;
  const cell = (text) => String(text ?? "").replaceAll("|", String.raw`\|`) || "-";

  return [
    "# Session Handoffs",
    "",
    "Every session handoff this project has taken, newest first. The numbered",
    "files in this directory are the source of truth; this index is generated from",
    "them by `handoff doctor`, so editing it by hand is work the next run throws away.",
    "",
    "## Index",
    "",
    ...renderTable(
      ["#", "Title", "Date", "Branch"],
      sorted.map((entry) => [link(entry), cell(entry.title), cell(entry.date), cell(entry.branch)]),
    ),
    "",
    "## Operating rules",
    "",
    "- Write a handoff with `/rule-mcp-handoff`; it persists to `docs/handoff/<NN>-<slug>.md`.",
    "- Never edit this file. Edit a handoff and let the next `handoff doctor` regenerate it.",
    "",
  ].join("\n");
}

/** Write the handoff index. */
export function updateHandoffIndex(handoffDir, entries) {
  writeFileSync(join(handoffDir, HANDOFF_INDEX_FILE), buildHandoffIndex(entries));
}
