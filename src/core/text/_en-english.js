/**
 * @module core/text/en-english
 *
 * English-only prose detection (hardening: every generated comment, identifier
 * and document is English, American spelling).
 *
 * Companion to the British-to-US dictionary in {@link module:core/fingerprint}:
 * `findFingerprints` flags UK-only spellings (the -our / -ise / -re / -ogue
 * families and the whole-word map); this module flags content that is not
 * English at all - foreign function words and non-ASCII letters in comments
 * and identifiers, or foreign prose in a whole markdown document.
 *
 * Precision first, the same way the fingerprint stem families are built:
 * explicit word lists beat clever heuristics. A bare `de`, `la` or `son` is
 * English- or acronym-adjacent and would be noise, so the foreign tokens below
 * are the unambiguous ones only - a comment that carries two of them, or a
 * single non-ASCII letter, is very likely not English.
 */

import { FOREIGN_TOKENS, FOREIGN_NAME_TOKENS } from "./_en-english.data.js";

/** Letters outside ASCII that an English comment or document has no call for. */
// Blocks that contain combining marks (Arabic, Hebrew, Devanagari, Thai) are
// deliberately absent: a slash-and-cover range there would scan wrong text.
const NON_ASCII_LETTER =
  /[\u00C0-\u00FF\u0100-\u024F\u1E00-\u1EFF\u0370-\u03FF\u0400-\u047F\u048A-\u052F\u10A0-\u10FF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/u;

const FOREIGN_RE = new RegExp(String.raw`\b(?:${FOREIGN_TOKENS.join("|")})\b`, "gi");

const FOREIGN_NAME_SET = new Set([...FOREIGN_TOKENS, ...FOREIGN_NAME_TOKENS].map((t) => t.toLowerCase()));

/**
 * Word endings that only occur in non-English words. Same precision contract:
 * endings that English shares (`-mento`/memento, `-ung`/lung, `-are`/share)
 * are deliberately absent.
 */
const FOREIGN_SUFFIX_RE =
  /(?:zione|zioni|izzare|izzata|izzato|aggio|anza|enza|encia|miento|mientos|ungen|keit|schaft)$/i;

/** True when a single word is recognizably not English. */
function foreignWord(word) {
  return FOREIGN_NAME_SET.has(word.toLowerCase()) || FOREIGN_SUFFIX_RE.test(word);
}

/** Mask string literals and template literals so comments stay but strings go. */
function maskStrings(code) {
  const out = [...code];
  let quote;
  let escaped = false;

  for (const [index, char] of out.entries()) {
    if (!quote) {
      if (char === "'" || char === '"' || char === "`") {
        quote = char;
      }

      continue;
    }

    if (escaped) {
      escaped = false;
      out[index] = " ";

      continue;
    }

    if (char === "\\") {
      escaped = true;
      out[index] = " ";

      continue;
    }

    if (char === quote) {
      quote = undefined;

      continue;
    }

    out[index] = " ";
  }

  return out.join("");
}

/** Every line comment and block comment in the code, after strings are masked. */
function extractComments(code) {
  const masked = maskStrings(code);
  const comments = [];
  const blockRe = /\/\*[\s\S]*?\*\//g;
  const lineRe = /\/\/[^\n]*/g;

  for (const match of masked.matchAll(blockRe)) {
    comments.push(match[0]);
  }

  for (const match of masked.matchAll(lineRe)) {
    comments.push(match[0]);
  }

  return comments;
}

/**
 * Identifier tokens from the code (strings and comments blanked first), split
 * on case boundaries so `dellaTabella` yields `della` + `tabella`.
 */
function identifierTokens(code) {
  const masked = maskStrings(code)
    .replaceAll(/\/\*[\s\S]*?\*\//g, " ")
    .replaceAll(/\/\/[^\n]*/g, " ");
  const tokens = [];

  for (const match of masked.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) {
    const name = match[0];
    const words = name.split(/(?<=[a-z0-9])(?=[A-Z])|[_]+/);
    tokens.push(...words.filter(Boolean));
  }

  return tokens;
}

/** Scan a run of prose/comment text for accents and foreign function words. */
function scanText(text) {
  const accented = [...new Set(text.match(NON_ASCII_LETTER))];
  const foreign = [...new Set((text.match(FOREIGN_RE) ?? []).map((t) => t.toLowerCase()))];

  return { accented, foreign };
}

/** One hit descriptor for the guardrail report. */
function hit(kind, token, where) {
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
