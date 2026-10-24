/**
 * @module core/text/compression-aggressive
 *
 * The `ultra` sentence-shape pass, applied on top of the per-line vocabulary
 * pass: sentence-initial coordinating conjunctions go, because at `ultra` the
 * structure of the list already carries what they connect.
 *
 * The vocabulary itself (phrases, fillers, articles, synonyms, abbreviations,
 * arrow causality) lives in `./_compression-line.js` and its data tables, so there
 * is one source of order rather than two passes racing over the same words.
 *
 * Same safety rules as the standard pass: fenced code, headings, table rows,
 * blockquotes and data-shaped lines are left alone. Idempotent: the stripper
 * loops, so `f(f(x)) === f(x)` even when two conjunctions open a line.
 */

import { fenceClosedBy, fenceOpenedBy } from "./_fence.js";
import { atLeast, compressionLevel } from "./_level.js";
import { isCodeLine, isYamlLine } from "./_line-shape.js";

/** A bullet or ordered-list marker the conjunction hides behind. */
const PREFIX_RE = /^([ \t]*(?:[*+-]|\d+\.)[ \t]+)?/;
const LEADING_CONJUNCTION_RE = /^(?:and|but|or|so|then|however|therefore)\b[ \t,]+/i;

/**
 * Strip sentence-initial conjunctions from one prose line.
 *
 * @param {string} line
 * @returns {string}
 */
function stripConjunctions(line) {
  const prefix = PREFIX_RE.exec(line)?.[1] ?? "";
  let rest = line.slice(prefix.length);

  while (LEADING_CONJUNCTION_RE.test(rest)) {
    rest = rest.replace(LEADING_CONJUNCTION_RE, "");
  }

  return prefix + rest;
}

/**
 * The ultra extra pass over already-compressed text. A no-op below `ultra`.
 *
 * @param {string} text
 * @param {{ level?: string }} [options]
 * @returns {string}
 */
export function compressTextAggressive(text, { level = compressionLevel() } = {}) {
  if (typeof text !== "string" || text.length === 0 || !atLeast(level, "ultra")) {
    return text;
  }

  let fence = null;

  return text
    .split("\n")
    .map((line) => {
      if (fence) {
        if (fenceClosedBy(line, fence)) {
          fence = null;
        }

        return line;
      }

      const opened = fenceOpenedBy(line);

      if (opened) {
        fence = opened;

        return line;
      }

      const trimmed = line.trimStart();

      if (trimmed.startsWith("#") || trimmed.startsWith("|") || trimmed.startsWith(">") || isCodeLine(line) || isYamlLine(trimmed)) {
        return line;
      }

      return stripConjunctions(line);
    })
    .join("\n");
}
