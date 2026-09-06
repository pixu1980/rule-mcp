/** @module core/text/en-english/tokenize - split code into the prose that can be judged */

import { FOREIGN_NAME_SET, FOREIGN_SUFFIX_RE } from "./_patterns.js";

/** True when a single word is recognizably not English. */
export function foreignWord(word) {
  return FOREIGN_NAME_SET.has(word.toLowerCase()) || FOREIGN_SUFFIX_RE.test(word);
}

/** Mask string literals and template literals so comments stay but strings go. */
export function maskStrings(code) {
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
export function extractComments(code) {
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
export function identifierTokens(code) {
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
