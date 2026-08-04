/**
 * @module core/bm25
 *
 * BM25 semantic search for rule skill content.
 * Builds an inverted index from skill SKILL.md files,
 * tokenizes into sections, and returns ranked results.
 *
 * Cache rebuilt on startup or via `skills reload` CLI command.
 *
 * Usage:
 *   import { buildIndex, search, clearIndex } from "./bm25.js";
 *
 *   buildIndex();           // build from all skills
 *   const results = search("React button component");
 *   // → [{ skill, section, score, snippet, ... }]
 */

import { getSkillNames, readSkill } from "../tools/router.js";
// eslint-disable-next-line no-unused-vars
import { skillCache } from "./skills.js";

// ─── BM25 parameters ──────────────────────────────────────────────

/** Term frequency saturation (default 1.2) */
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
 * @property {Map<string, Map<number, number>>} df — term → { docId → termFreq }
 * @property {Map<number, number>} docLength — docId → total terms in document
 * @property {Bm25Doc[]} docs — array of documents
 * @property {number} totalDocs — total number of indexed documents
 * @property {number} avgDocLength — average document length
 */

/**
 * @typedef {Object} Bm25Doc
 * @property {number} id — document ID
 * @property {string} skill — skill name (e.g. "rule-frontend-react")
 * @property {string} section — section heading (e.g. "CSS Architecture")
 * @property {string} text — full section text
 * @property {string} snippet — first 200 chars of text
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
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= MIN_TERM_LENGTH && !STOPWORDS.has(t));
}

/**
 * Stopwords filtered from index and query.
 * Curated for technical frontend content — keeps framework/language terms.
 */
const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
  "her", "was", "one", "our", "out", "has", "have", "been", "some", "same",
  "also", "than", "then", "that", "them", "this", "they", "will", "with",
  "what", "when", "where", "which", "while", "from", "each", "just",
  "like", "more", "most", "much", "only", "over", "such", "very", "way",
  "well", "your", "into", "should", "could", "would", "about", "after",
  "their", "there", "these", "those", "other", "every", "first", "last",
  "still", "than", "then", "its", "may", "make", "made", "used", "use",
  "using", "need", "without", "within", "both", "between", "under",
  "above", "before", "after", "during", "through", "against", "being",
  "done", "does", "doing", "having", "get", "got", "give", "given",
  "take", "taken", "took", "see", "seen", "say", "said", "part", "also",
  "back", "set", "put", "run", "let", "keep", "found", "new", "many",
  "long", "thing", "things", "work", "works", "working", "number",
  "line", "means", "same", "must", "next", "two", "three", "four",
  "five", "six", "seven", "eight", "nine", "ten", "top", "bottom",
  "left", "right", "case", "default", "public", "private", "static",
  "void", "true", "false", "null", "type", "types", "value", "values",
  "method", "methods", "call", "calls", "called", "calling",
  "define", "defined", "defines", "defining", "spec", "specs",
  "doc", "docs", "file", "files", "folder", "folders",
]);

// ─── Index building ───────────────────────────────────────────────

/**
 * Extract sections from SKILL.md content.
 * Splits by `## Heading` and returns { heading, text } pairs.
 *
 * @param {string} content — Full SKILL.md content
 * @returns {Array<{ heading: string, text: string }>}
 */
function extractSections(content) {
  const lines = content.split("\n");
  const sections = [];
  let currentHeading = "";
  let currentLines = [];

  for (const line of lines) {
    const m = line.match(/^##\s+(.+)/);
    if (m) {
      if (currentHeading && currentLines.length > 0) {
        sections.push({ heading: currentHeading, text: currentLines.join("\n") });
      }
      currentHeading = m[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentHeading && currentLines.length > 0) {
    sections.push({ heading: currentHeading, text: currentLines.join("\n") });
  }

  return sections;
}

/**
 * Build the BM25 inverted index from all loaded skills.
 * Index is cached in memory until `clearIndex()` or `buildIndex(true)`.
 *
 * @param {boolean} [force=false] — Force rebuild even if index exists
 */
export function buildIndex(force = false) {
  if (_index && !force) {return;}

  const skillNames = getSkillNames();
  const df = new Map(); // term → docId → freq
  const documentLength = new Map();
  const docs = [];
  let documentId = 0;

  for (const skillName of skillNames) {
    const content = readSkill(skillName);
    if (!content) {continue;}

    const sections = extractSections(content);
    for (const section of sections) {
      if (!section.text.trim()) {continue;}

      const terms = tokenize(section.text);
      const termFreq = new Map();

      for (const term of terms) {
        termFreq.set(term, (termFreq.get(term) || 0) + 1);
      }

      // Store document
      const id = documentId++;
      docs.push({
        id,
        skill: skillName,
        section: section.heading,
        text: section.text,
        snippet: section.text.replaceAll(/\s+/g, " ").slice(0, 200).trim(),
      });

      documentLength.set(id, terms.length);

      // Update inverted index
      for (const [term, freq] of termFreq) {
        if (!df.has(term)) {df.set(term, new Map());}
        df.get(term).set(id, freq);
      }
    }
  }

  const totalDocs = docs.length;
  const avgDocumentLength = totalDocs > 0
    ? [...documentLength.values()].reduce((a, b) => a + b, 0) / totalDocs
    : 0;

  _index = { df, docLength: documentLength, docs, totalDocs, avgDocLength: avgDocumentLength };
}

/**
 * Clear the BM25 index (called on `skills reload`).
 */
export function clearIndex() {
  _index = null;
}

/**
 * Check if index is built.
 * @returns {boolean}
 */
export function isIndexReady() {
  return _index !== null && _index.totalDocs > 0;
}

/**
 * Get index statistics.
 * @returns {{ totalDocs: number, avgDocLength: number, uniqueTerms: number } | null}
 */
export function getIndexStats() {
  if (!_index) {return null;}
  return {
    totalDocs: _index.totalDocs,
    avgDocLength: Math.round(_index.avgDocLength * 10) / 10,
    uniqueTerms: _index.df.size,
  };
}

// ─── BM25 scoring ─────────────────────────────────────────────────

/**
 * Compute BM25 score for a single term against a document.
 *
 * @param {number} tf — Term frequency in document
 * @param {number} docLen — Document length in terms
 * @param {number} avgDocLen — Average document length
 * @param {number} N — Total number of documents
 * @param {number} n — Number of documents containing the term
 * @returns {number}
 */
function bm25Score(tf, docLen, avgDocLen, N, n) {
  if (n === 0 || N === 0) {return 0;}

  // IDF (inverse document frequency) with smoothing
  const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));

  // Term frequency saturation + length normalization
  const numerator = tf * (K1 + 1);
  const denominator = tf + K1 * (1 - B + B * (docLen / avgDocLen));

  return idf * numerator / denominator;
}

/**
 * Search the BM25 index for a query.
 * Returns ranked results with scores, sorted by relevance descending.
 *
 * @param {string} query — Search query
 * @param {number} [maxResults=20] — Maximum results
 * @returns {Array<{ skill: string, section: string, score: number, snippet: string }>}
 */
export function search(query, maxResults = DEFAULT_MAX_RESULTS) {
  if (!_index) {return [];}

  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) {return [];}

  const { df, docLength, docs, totalDocs, avgDocLength } = _index;
  const scores = new Map(); // docId → cumulative score

  for (const term of queryTerms) {
    const posting = df.get(term);
    if (!posting) {continue;}

    const n = posting.size; // docs containing this term

    for (const [documentId, tf] of posting) {
      const documentLength = docLength.get(documentId) || 0;
      const score = bm25Score(tf, documentLength, avgDocLength, totalDocs, n);

      scores.set(documentId, (scores.get(documentId) || 0) + score);
    }
  }

  // Sort by score descending
  const ranked = [...scores]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxResults)
    .map(([documentId, score]) => {
      const document = docs[documentId];
      return {
        skill: document.skill,
        section: document.section,
        score: Math.round(score * 1000) / 1000,
        snippet: document.snippet,
      };
    });

  return ranked;
}
