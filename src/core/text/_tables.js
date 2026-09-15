

/**
 * @module core/text/tables
 *
 * The vocabulary tables, compiled per level and cached.
 *
 * Compiling is not free - one regular expression per phrase, one alternation
 * over every filler - and the level does not change inside a process, so the
 * work is done once per level and reused for every line after that.
 */

import { ABBREVIATIONS } from "./_abbreviations.data.js";
import { FILLERS } from "./_fillers.data.js";
import { atLeast } from "./_level.js";
import { PHRASES } from "./_phrases.data.js";
import { SYNONYMS } from "./_synonyms.data.js";

/** Keep the replacement's case in step with what it replaced. */
export function applyCase(match, replacement) {
  if (!replacement) {
    return "";
  }

  const first = match[0];

  if (first !== first.toLowerCase() && replacement[0] === replacement[0].toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }

  return replacement;
}

/** Longest first, so a long phrase is never cut short by a shorter prefix. */
const byLength = (a, b) => b.from.length - a.from.length;

const compiled = new Map();

/**
 * The tables that apply at a level, compiled once.
 *
 * @param {string} level
 * @returns {{ openers: RegExp[], phrases: Array<{ re: RegExp, to: string }>, fillerRe: RegExp|null, words: Map<string, string>, wordRe: RegExp|null }}
 */
export function tables(level) {
  const cached = compiled.get(level);

  if (cached) {
    return cached;
  }

  const applies = PHRASES.filter((entry) => atLeast(level, entry.level)).sort(byLength);
  const source = (entry) => entry.from.replaceAll(" ", String.raw`\s+`);

  // Anchored pleasantries: only when they open the line, and dropped whole.
  const openers = applies.filter((entry) => entry.anchored).map((entry) => new RegExp(String.raw`^(?:${source(entry)})\b[\s,!.:;-]*`, "i"));

  const phrases = applies.filter((entry) => !entry.anchored).map((entry) => ({ re: new RegExp(String.raw`\b${source(entry)}\b`, "gi"), to: entry.to }));

  const fillers = FILLERS.filter((entry) => atLeast(level, entry.level)).map((entry) => entry.pattern);
  const fillerRe = fillers.length > 0 ? new RegExp(String.raw`\b(?:${fillers.join("|")})\b\s*`, "gi") : null;

  const wordEntries = [...SYNONYMS, ...ABBREVIATIONS].filter((entry) => atLeast(level, entry.level)).sort(byLength);
  const words = new Map(wordEntries.map((entry) => [entry.from, entry.to]));
  const wordRe = wordEntries.length > 0 ? new RegExp(String.raw`\b(?:${wordEntries.map((entry) => entry.from).join("|")})\b`, "gi") : null;

  const entry = { openers, phrases, fillerRe, words, wordRe };

  compiled.set(level, entry);

  return entry;
}
