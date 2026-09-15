/**
 * @module core/text/compression-line
 *
 * The per-line prose compressor: the one place that owns the order the
 * vocabulary tables fire in.
 *
 * The order is not a preference. Multi-word phrases run BEFORE single words,
 * always: a word table that fires first eats the head of a phrase and inverts
 * it - "Quite a few things changed." became "few things changed." that way.
 * Articles, synonyms and abbreviations follow, each gated by the level that
 * owns it (see `./_level.js` and `docs/05-env-variables.md`).
 */

import { atLeast, compressionLevel } from "./_level.js";
import { isCodeLine, isYamlLine } from "./_line-shape.js";
import { PLACEHOLDER_CHAR, protectSpans, restoreSpans } from "./_protect.js";
import { applyCase, tables } from "./_tables.js";

export { looksLikeJson } from "./_classify.js";
export { atLeast, compressionEnabled, compressionLevel, DEFAULT_LEVEL, LEVELS } from "./_level.js";

/** Leading articles: dropped at `full` and above. A placeholder counts as a word. */
const ARTICLE_RE = new RegExp(String.raw`\b(?:the|an|a)\s+(?=[A-Za-z0-9${PLACEHOLDER_CHAR}])`, "gi");

/**
 * Compress a single prose line, protecting inline code, URLs and paths.
 *
 * Structural lines (headings, table rows, blockquotes, fence markers) and
 * data-shaped lines (code, `key: value`) come back with nothing but their
 * trailing whitespace removed.
 *
 * @param {string} line
 * @param {string} [level] defaults to the level the environment asks for
 * @returns {string}
 */
export function compressLine(line, level = compressionLevel()) {
  if (level === "off") {
    return line;
  }

  const trimmed = line.trimStart();

  if (trimmed.startsWith("#") || trimmed.startsWith("|") || trimmed.startsWith(">") || trimmed.startsWith("```") || isCodeLine(line) || isYamlLine(trimmed)) {
    return line.replace(/[ \t]+$/, "");
  }

  const indent = line.slice(0, line.length - trimmed.length);
  const { work: protectedLine, spans } = protectSpans(trimmed);
  const { openers, phrases, fillerRe, words, wordRe } = tables(level);
  let work = protectedLine;

  // 0. Whole pleasantries that open the line. Looped, because one opener can
  //    uncover the next ("Sure! I would be happy to help.") and because a rule
  //    that changes its own output on a second pass is not idempotent.
  for (let changing = true; changing;) {
    changing = false;

    for (const opener of openers) {
      const stripped = work.replace(opener, "");

      if (stripped !== work) {
        work = stripped;
        changing = true;
      }
    }
  }

  // 1. Phrases, longest first, before any single-word rule sees the line.
  for (const { re, to } of phrases) {
    work = work.replace(re, (match) => applyCase(match, to));
  }

  // 2. Filler, hedging and pleasantries (lite and above).
  if (fillerRe) {
    work = work.replaceAll(fillerRe, "");
  }

  // 3. Leading articles (full and above).
  if (atLeast(level, "full")) {
    work = work.replaceAll(ARTICLE_RE, "");
  }

  // 4. Short synonyms (full) and abbreviations (ultra).
  if (wordRe) {
    work = work.replace(wordRe, (match) => applyCase(match, words.get(match.toLowerCase()) ?? match));
  }

  work = work
    .replaceAll(/[ \t]{2,}/g, " ")
    .replace(/^[ \t]+/, "")
    .replace(/[ \t]+$/, "");

  // A removal leaves punctuation behind that belonged to what it removed:
  // "Of course, at the end of the day, this" collapsed to ", , this". Only a
  // line something was actually removed from is cleaned, so prose that starts
  // with a period (".env is read first") keeps it.
  if (work !== protectedLine) {
    work = work
      .replaceAll(/([,;:])[ \t]*(?=[,;:])/g, "")
      .replaceAll(/[ \t]+([,;:.!?])/g, "$1")
      .replace(/^[\s,;:!.]+/, "");
  }

  return indent + restoreSpans(work, spans);
}
