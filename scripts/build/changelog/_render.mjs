/** @module scripts/build/changelog/render - one commit to one entry, one release to one block */

import { stripFingerprint } from "../../../src/core/text/_fingerprint.js";
import { SECTION_FOR_TYPE, SECTION_ORDER, SUBJECT } from "./_sections.mjs";

export function toEntry(commit) {
  const match = SUBJECT.exec(commit.subject);
  if (!match) {
    return null;
  }

  const { type, scope, subject, breaking } = match.groups;
  const isBreaking = Boolean(breaking) || /^BREAKING CHANGE:/m.test(commit.body);
  // A breaking feature is still an addition, so the type keeps its section and
  // the entry carries the mark. A breaking change to a type that is normally
  // noise is the exception: it surfaces under Changed rather than disappearing.
  const section = SECTION_FOR_TYPE[type] ?? (isBreaking ? "Changed" : null);
  if (!section) {
    return null;
  }

  // Older subjects carry typographic characters and British spellings that the
  // house style rejects. The commit is immutable; the rendered entry is not, so
  // it is cleaned here with the same pass every tool result goes through.
  return { section, scope, subject: stripFingerprint(subject), hash: commit.hash, breaking: isBreaking };
}

/** Render one release's entries, grouped by section. */
export function renderRelease(heading, entries) {
  const bySection = new Map();
  for (const entry of entries) {
    if (!bySection.has(entry.section)) {
      bySection.set(entry.section, []);
    }
    bySection.get(entry.section).push(entry);
  }
  if (bySection.size === 0) {
    return "";
  }

  const lines = [`## ${heading}`, ""];
  for (const section of SECTION_ORDER) {
    const rows = bySection.get(section);
    if (!rows || rows.length === 0) {
      continue;
    }
    lines.push(`### ${section}`, "");
    for (const row of rows) {
      const mark = row.breaking ? "**BREAKING** " : "";
      lines.push(`- ${mark}**${row.scope}**: ${row.subject} (\`${row.hash}\`)`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Build the whole file.
 *
 * @param {{ projectDir?: string }} [options]
 * @returns {string} the file contents, ending in a newline
 */
