

/**
 * @module cli/setup/rules
 *
 * Pure text surgery on agent instruction files (CLAUDE.md, GEMINI.md,
 * AGENTS.md, .cursorrules). No I/O: the caller reads, transforms, writes.
 *
 * The invariant these functions exist to hold is round-tripping. Install and
 * uninstall run in cycles on the same file, and the previous shell
 * implementation drifted a blank line per cycle until the fix in ADR 041.
 * Normalizing the trailing whitespace on the way in AND on the way out is
 * what makes `withoutRulesBlock(withRulesBlock(x)) === x` true for any x.
 */

import { RULES_CONTENT, RULES_END_MARKER, RULES_MARKER } from "./_rules.data.js";

/** Whether this file already carries the block. */
export function hasRulesBlock(text) {
  return String(text ?? "").includes(RULES_MARKER);
}

/** Collapse any run of trailing newlines down to exactly one. */
const oneTrailingNewline = (text) => `${text.replace(/\n*$/, "")}\n`;

/**
 * Append the block, separated from existing content by exactly one blank
 * line. An empty file gets the block with no leading blank.
 */
export function withRulesBlock(text) {
  const existing = String(text ?? "");

  if (existing.trim() === "") {
    return `${RULES_CONTENT}\n`;
  }

  return `${oneTrailingNewline(existing)}\n${RULES_CONTENT}\n`;
}

/**
 * Remove the whole block, sentinel lines included, then restore the file's
 * trailing whitespace to a single newline.
 *
 * Line-oriented on purpose: the sentinels each own a full line, and deleting
 * the range between them is what the sed implementation did. Matching on
 * substrings instead would leave a stray empty line where the sentinel was.
 */
export function withoutRulesBlock(text) {
  const source = String(text ?? "");

  if (!hasRulesBlock(source)) {
    return source;
  }

  const lines = source.split("\n");
  const kept = [];
  let inside = false;

  for (const line of lines) {
    if (!inside && line.includes(RULES_MARKER)) {
      inside = true;

      // Drop the single blank line `withRulesBlock` inserted as a separator.
      // Without this, a block followed by user content leaves a blank behind
      // on every uninstall and the round trip stops being lossless.
      if (kept.at(-1) === "") {
        kept.pop();
      }

      continue;
    }

    if (inside) {
      // The end sentinel closes the range and is dropped with it.
      if (line.includes(RULES_END_MARKER)) {
        inside = false;
      }

      continue;
    }

    kept.push(line);
  }

  const remaining = kept.join("\n");

  return remaining.trim() === "" ? "" : oneTrailingNewline(remaining);
}
