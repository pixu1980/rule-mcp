

/**
 * @module core/text/caveman-blocks
 *
 * The block walker: it splits text on fence boundaries, compresses every prose
 * run, and checks each run against its original with `./compress-guard/`.
 *
 * A run that loses a heading, a code block or a URL is emitted unchanged and
 * counted. That per-block rollback is what makes an aggressive vocabulary safe
 * to ship: a bad rule costs one paragraph, never the whole result, and the
 * rollback count is the signal that the rule is bad.
 */

import { compressTextAggressive } from "./_caveman-aggressive.js";
import { looksLikeJson } from "./_classify.js";
import { compressLine } from "./_caveman-line.js";
import { fenceClosedBy, fenceOpenedBy } from "./_fence.js";
import { cavemanLevel } from "./_level.js";
import { guardCompression } from "./compress-guard/index.js";

/**
 * Compress prose/markdown text, guarding every prose run.
 *
 * @param {string} text
 * @param {{ level?: string }} [options]
 * @returns {{ text: string, rollbacks: number }} `rollbacks` counts the prose
 *   runs that failed the guard and were emitted unchanged.
 */
export function compressTextGuarded(text, { level = cavemanLevel() } = {}) {
  if (typeof text !== "string" || text.length === 0 || level === "off" || looksLikeJson(text)) {
    return { text, rollbacks: 0 };
  }

  const out = [];
  let run = { original: [], compressed: [] };
  let fence = null;
  let blankRun = 0;
  let rollbacks = 0;

  /** Close the current prose run: keep the compressed text only if it is safe. */
  const flush = () => {
    if (run.original.length === 0) {
      return;
    }

    const original = run.original.join("\n");
    const compressed = run.compressed.join("\n");

    if (guardCompression(original, compressed).ok) {
      out.push(compressed);
    } else {
      rollbacks += 1;
      out.push(original);
    }

    run = { original: [], compressed: [] };
  };

  for (const line of text.split("\n")) {
    if (fence) {
      out.push(line); // verbatim inside code, closing fence included

      if (fenceClosedBy(line, fence)) {
        fence = null;
      }

      continue;
    }

    const opened = fenceOpenedBy(line);

    if (opened) {
      flush();
      fence = opened;
      out.push(line.replace(/[ \t]+$/, ""));
      blankRun = 0;
      continue;
    }

    const compressed = compressTextAggressive(compressLine(line, level), { level });

    if (compressed.trim() === "") {
      blankRun += 1;

      if (blankRun > 1) {
        continue;
      } // collapse consecutive blanks to one

      run.original.push("");
      run.compressed.push("");
    } else {
      blankRun = 0;
      run.original.push(line);
      run.compressed.push(compressed);
    }
  }

  flush();

  // Trim leading/trailing blank lines.
  const joined = out
    .join("\n")
    .replace(/^(?:[ \t]*\n)+/, "")
    .replace(/(?:\n[ \t]*)+$/, "");

  return { text: joined, rollbacks };
}
