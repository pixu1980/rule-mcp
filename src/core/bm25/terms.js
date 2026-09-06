// Auto-split from src/core/bm25.js - see ./bm25/index.js
/** Scoring constants plus the tokenizer/stemmer family. */

import { STOPWORDS } from "./stopwords-union.js";
const K1 = 1.2;

/** Length normalization (0 = no norm, 1 = full norm, default 0.75) */
const B = 0.75;

/** Minimum term length to include in index */
const MIN_TERM_LENGTH = 2;

/** Max results per search */
const DEFAULT_MAX_RESULTS = 20;

// ─── Index structure ──────────────────────────────────────────────

/**
 * @typedef {Object} Bm25Index
 * @property {Map<string, Map<number, number>>} df - term → { docId → termFreq }
 * @property {Map<number, number>} docLength - docId → total terms in document
 * @property {Bm25Doc[]} docs - array of documents
 * @property {number} totalDocs - total number of indexed documents
 * @property {number} avgDocLength - average document length
 */

/**
 * @typedef {Object} Bm25Doc
 * @property {number} id - document ID
 * @property {string} skill - skill name (e.g. "rule-frontend-react")
 * @property {string} section - section heading (e.g. "CSS Architecture")
 * @property {string} text - full section text
 * @property {string} snippet - first 200 chars of text
 */

/** @type {Bm25Index | null} */
let _index = null;

// ─── Tokenizer ────────────────────────────────────────────────────

/**
 * Tokenize text into lowercase terms, filtering stopwords and short words.
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  return splitWords(text)
    .flatMap(splitCompound)
    .map(stem)
    .filter((t) => t.length >= MIN_TERM_LENGTH && !STOPWORDS.has(t));
}

/** Split on anything that is not a letter or digit, before case is lost. */
function splitWords(text) {
  return String(text)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

function splitCompound(word) {
  const lower = word.toLowerCase();
  const parts = word
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .split(" ")
    .filter(Boolean);

  return parts.length > 1 ? [lower, ...parts] : [lower];
}

/**
 * Plural and third-person only. Nothing aggressive: an over-stemmer creates
 * false matches that are harder to debug than the misses it fixes.
 *
 * @param {string} word
 * @returns {string}
 */
function stem(word) {
  if (word.length <= 3 || word.endsWith("ss") || word.endsWith("us")) {
    return word;
  }

  if (word.endsWith("ies") && word.length > 4) {
    return `${word.slice(0, -3)}y`;
  }

  if (/(?:ch|sh|[sxz])es$/.test(word)) {
    return word.slice(0, -2);
  }

  if (word.endsWith("s")) {
    return word.slice(0, -1);
  }

  return word;
}

export { K1, B, MIN_TERM_LENGTH, DEFAULT_MAX_RESULTS, tokenize, splitWords, splitCompound, stem };
