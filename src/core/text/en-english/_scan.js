

/** @module core/text/en-english/scan - the three scanners: code, path, document */

import { FOREIGN_TOKENS } from "../_en-english.data.js";
import { FOREIGN_RE, NON_ASCII_LETTER } from "./_patterns.js";
import { extractComments, foreignWord, identifierTokens } from "./_tokenize.js";

/** Scan a run of prose/comment text for accents and foreign function words. */
export function scanText(text) {
  const accented = [...new Set(text.match(NON_ASCII_LETTER))];
  const foreign = [...new Set((text.match(FOREIGN_RE) ?? []).map((t) => t.toLowerCase()))];

  return { accented, foreign };
}

/** One hit descriptor for the guardrail report. */
export function hit(kind, token, where) {
  return `${where}: ${kind}${token ? ` "${token}"` : ""}`;
}

/**
 * Flag non-English content in code: comments and identifiers.
 *
 * A comment fails when it carries a non-ASCII letter or two distinct foreign
 * function words; an identifier fails when any of its camel/snake tokens is a
 * foreign function word.
 *
 * @param {string} code
 * @returns {string[]} human-readable offenders, empty when the code is English
 */
export function scanCodeForForeign(code) {
  const hits = [];

  for (const comment of extractComments(code)) {
    const { accented, foreign } = scanText(comment);

    if (accented.length > 0) {
      hits.push(hit("accent", accented[0], "comment"));
    } else if (foreign.length >= 2) {
      hits.push(hit("non-English words", foreign.slice(0, 2).join(", "), "comment"));
    }
  }

  for (const token of identifierTokens(code)) {
    const lower = token.toLowerCase();

    if (FOREIGN_TOKENS.includes(lower)) {
      hits.push(hit("foreign identifier", token, "identifier"));
    }
  }

  return hits;
}

/**
 * Flag non-English file and folder names in a path.
 *
 * Each path segment is split into words on separators and camelCase
 * boundaries; a segment fails on a non-ASCII letter or on any word from the
 * foreign dictionaries (function words plus name-plausible content words).
 *
 * @param {string} filePath
 * @returns {string[]} human-readable offenders, empty when the path is English
 */
export function scanPathForForeign(filePath) {
  const hits = [];

  for (const segment of String(filePath).split(/[\\/]+/)) {
    if (segment === "") {
      continue;
    }

    const accented = segment.match(NON_ASCII_LETTER);

    if (accented) {
      hits.push(hit("accent", accented[0], `path segment "${segment}"`));
      continue;
    }

    const words = segment.split(/[^A-Za-z]+|(?<=[a-z0-9])(?=[A-Z])/).filter(Boolean);
    const foreign = words.find((word) => foreignWord(word));

    if (foreign) {
      hits.push(hit("non-English name", foreign, `path segment "${segment}"`));
    }
  }

  return hits;
}

/**
 * Flag non-English prose across a whole document (markdown / plain text),
 * with fenced blocks, inline code and URLs blanked out.
 *
 * @param {string} document
 * @returns {string[]}
 */
export function scanDocumentForForeign(document) {
  const prose = [];
  let inFence = false;

  for (const line of document.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      prose.push("");
      continue;
    }

    prose.push(
      inFence
        ? ""
        : line
            .replaceAll(/`[^`]*`/g, " ")
            .replaceAll(/https?:\/\/\S+/g, " ")
            // An address is an identifier, not prose. Without this, every
            // generated ADR failed on the domain suffix of its author e-mail,
            // which collides with a Portuguese function word.
            .replaceAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, " ")
            .replaceAll(/[#*_>|:-]+/g, " "),
    );
  }

  const { accented, foreign } = scanText(prose.join("\n"));

  if (accented.length > 0) {
    return [hit("accent", accented[0], "document")];
  }

  if (foreign.length > 0) {
    return [hit("non-English words", foreign.slice(0, 2).join(", "), "document")];
  }

  return [];
}
