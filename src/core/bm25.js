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

import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { getRuntimePaths, getSkillsDirs as getSkillsDirectories } from "../cli/paths.js";
import { codeSignature } from "./code-signature.js";
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
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= MIN_TERM_LENGTH && !STOPWORDS.has(t));
}

/** Split on anything that is not a letter or digit, before case is lost. */
function splitWords(text) {
  return String(text)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
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

/**
 * Words that ask a question rather than name a topic.
 *
 * Not in STOPWORDS because the scorer is tuned with that list and this addition
 * is not worth reopening it. Canonicalization is a different job: for a cache
 * key, "how do I X" and "X" are the same question, while for a BM25 score every
 * surviving term is a chance to match a heading.
 */
const INTERROGATIVES = new Set([
  "how",
  "why",
  "who",
  "whom",
  "whose",
  "whether",
  "please",
  "help",
  "want",
  "wanted",
  "tell",
  "show",
  "explain",
  "anyone",
  "someone",
  "do",
  "did",
  "was",
]);

/**
 * The canonical form of a query: its tokens, deduplicated and sorted.
 *
 * Deliberately NOT the search tokenizer. `splitCompound` emits the parts of a
 * camelCase identifier alongside the whole token, which makes the canonical
 * form depend on capitalization. For scoring that is a feature; for a cache key
 * it is the bug.
 *
 * Conservative on purpose. It drops interrogatives and the stopwords, and keeps
 * every content word, including verbs like "build" and "create". Merging two
 * prompts that are not the same question replays a wrong answer the caller
 * cannot detect; failing to merge two that are costs one miss.
 *
 * The stopword list is the one the canonicalizer ships with (a superset of the
 * scorer's): canonicalization has no scoring tuning to protect, so it can
 * afford the section-title cliches.
 *
 * @param {string} text
 * @returns {string} sorted unique terms, space-joined; "" when nothing survives
 */
export function canonicalizeQuery(text) {
  const terms = splitWords(text)
    .map((word) => stem(word.toLowerCase()))
    .filter((term) => term.length >= MIN_TERM_LENGTH && !CANONICAL_STOPWORDS.has(term) && !INTERROGATIVES.has(term));

  return [...new Set(terms)].sort().join(" ");
}

/** The canonicalizer's own stopword set: the scorer's list plus the cliches. */
const CANONICAL_STOPWORDS = new Set([
  "best",
  "practice",
  "practices",
  "overview",
  "introduction",
  "summary",
  "basics",
  "reference",
  "general",
  "quick",
  "guide",
  "guides",
  "notes",
]);

/**
 * Stopwords filtered from index and query.
 * Curated for technical frontend content - keeps framework/language terms.
 */
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "all",
  "can",
  "had",
  "her",
  "was",
  "one",
  "our",
  "out",
  "has",
  "have",
  "been",
  "some",
  "same",
  "also",
  "than",
  "then",
  "that",
  "them",
  "this",
  "they",
  "will",
  "with",
  "what",
  "when",
  "where",
  "which",
  "while",
  "from",
  "each",
  "just",
  "like",
  "more",
  "most",
  "much",
  "only",
  "over",
  "such",
  "very",
  "way",
  "well",
  "your",
  "into",
  "should",
  "could",
  "would",
  "about",
  "after",
  "their",
  "there",
  "these",
  "those",
  "other",
  "every",
  "first",
  "last",
  "still",
  "than",
  "then",
  "its",
  "may",
  "make",
  "made",
  "used",
  "use",
  "using",
  "need",
  "without",
  "within",
  "both",
  "between",
  "under",
  "above",
  "before",
  "after",
  "during",
  "through",
  "against",
  "being",
  "done",
  "does",
  "doing",
  "having",
  "get",
  "got",
  "give",
  "given",
  "take",
  "taken",
  "took",
  "see",
  "seen",
  "say",
  "said",
  "part",
  "also",
  "back",
  "set",
  "put",
  "run",
  "let",
  "keep",
  "found",
  "new",
  "many",
  "long",
  "thing",
  "things",
  "work",
  "works",
  "working",
  "number",
  "line",
  "means",
  "same",
  "must",
  "next",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "top",
  "bottom",
  "left",
  "right",
  "case",
  "default",
  "public",
  "private",
  "static",
  "void",
  "true",
  "false",
  "null",
  "type",
  "types",
  "value",
  "values",
  "method",
  "methods",
  "call",
  "calls",
  "called",
  "calling",
  "define",
  "defined",
  "defines",
  "defining",
  "spec",
  "specs",
  "doc",
  "docs",
  "file",
  "files",
  "folder",
  "folders",
]);

// The canonicalizer deliberately ships the scorer's stopwords too; add them
// once the scorer's list exists so the two never drift apart silently.
for (const word of STOPWORDS) {
  CANONICAL_STOPWORDS.add(word);
}

// ─── Index building ───────────────────────────────────────────────

/**
 * Extract sections from SKILL.md content.
 * Splits by `## Heading` and returns { heading, text } pairs.
 *
 * @param {string} content - Full SKILL.md content
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
 * @param {boolean} [force=false] - Force rebuild even if index exists
 */
export function buildIndex(force = false) {
  if (_index && !force) {
    return;
  }

  // Tokenizing every skill costs ~95ms and produces the same index every time
  // the code and the skills are unchanged. Reading it back costs ~3ms, and a
  // stdio server pays the build once while a CLI invocation and every hook pay
  // it again (PERF-2).
  if (!force && restoreIndex()) {
    return;
  }

  const skillNames = getSkillNames();
  const df = new Map(); // term → docId → freq
  const documentLength = new Map();
  const docs = [];
  let documentId = 0;

  for (const skillName of skillNames) {
    const content = readSkill(skillName);
    if (!content) {
      continue;
    }

    const sections = extractSections(content);
    for (const section of sections) {
      if (!section.text.trim()) {
        continue;
      }

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
        if (!df.has(term)) {
          df.set(term, new Map());
        }
        df.get(term).set(id, freq);
      }
    }
  }

  const totalDocs = docs.length;
  const avgDocumentLength = totalDocs > 0 ? [...documentLength.values()].reduce((a, b) => a + b, 0) / totalDocs : 0;

  _index = { df, docLength: documentLength, docs, totalDocs, avgDocLength: avgDocumentLength };
  persistIndex();
}

/**
 * The key a stored index is filed under: this code, these skills.
 *
 * @returns {string} 12 hex characters
 */
export function indexCacheKey() {
  return createHash("sha256").update(`${codeSignature()}:${skillsSignature()}`).digest("hex").slice(0, 12);
}

/** Where a built index is kept, keyed by the code and the skills that produced it. */
function indexCacheFile() {
  return join(getRuntimePaths().stateDir, `bm25-${indexCacheKey()}.json.gz`);
}

/** The newest modification time and file count across every skills directory. */
function skillsSignature() {
  let newest = 0;
  let count = 0;

  for (const dir of Object.values(getSkillsDirectories())) {
    const walk = (path) => {
      let entries;
      try {
        entries = readdirSync(path, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const child = join(path, entry.name);

        if (entry.isDirectory()) {
          walk(child);
        } else if (entry.name.endsWith(".md")) {
          count += 1;
          newest = Math.max(newest, statSync(child).mtimeMs);
        }
      }
    };
    walk(dir);
  }

  return `${count}:${newest}`;
}

/** Whether an index may be read from or written to disk at all. */
function indexCacheEnabled() {
  return process.env.RULE_MCP_NO_CACHE !== "1";
}

/**
 * Load an index already built for this exact code and these skills.
 *
 * @returns {boolean} whether `_index` was restored
 */
function restoreIndex() {
  if (!indexCacheEnabled()) {
    return false;
  }

  try {
    const stored = JSON.parse(gunzipSync(readFileSync(indexCacheFile())).toString());

    _index = {
      df: new Map(stored.df.map(([term, postings]) => [term, new Map(postings)])),
      docLength: new Map(stored.docLength),
      docs: stored.docs,
      totalDocs: stored.totalDocs,
      avgDocLength: stored.avgDocLength,
    };

    return true;
  } catch {
    return false;
  }
}

/** Write the built index out, best effort: a failure here only costs a rebuild. */
function persistIndex() {
  if (!indexCacheEnabled() || !_index) {
    return;
  }

  try {
    const stored = {
      df: [..._index.df].map(([term, postings]) => [term, [...postings]]),
      docLength: [..._index.docLength],
      docs: _index.docs,
      totalDocs: _index.totalDocs,
      avgDocLength: _index.avgDocLength,
    };
    const file = indexCacheFile();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, gzipSync(JSON.stringify(stored)));

    // One index is useful; the one from every previous code signature is not.
    // The current key is the only one that can ever be read.
    for (const name of readdirSync(dirname(file))) {
      if (name.startsWith("bm25-") && name.endsWith(".json.gz") && name !== basename(file)) {
        rmSync(join(dirname(file), name), { force: true });
      }
    }
  } catch {
    /* a cache that cannot be written is a cache that is not used */
  }
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
  if (!_index) {
    return null;
  }
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
 * @param {number} tf - Term frequency in document
 * @param {number} docLen - Document length in terms
 * @param {number} avgDocLen - Average document length
 * @param {number} N - Total number of documents
 * @param {number} n - Number of documents containing the term
 * @returns {number}
 */
function bm25Score(tf, docLen, avgDocLen, N, n) {
  if (n === 0 || N === 0) {
    return 0;
  }

  // IDF (inverse document frequency) with smoothing
  const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));

  // Term frequency saturation + length normalization
  const numerator = tf * (K1 + 1);
  const denominator = tf + K1 * (1 - B + B * (docLen / avgDocLen));

  return (idf * numerator) / denominator;
}

/**
 * Search the BM25 index for a query.
 * Returns ranked results with scores, sorted by relevance descending.
 *
 * @param {string} query - Search query
 * @param {number} [maxResults=20] - Maximum results
 * @returns {Array<{ skill: string, section: string, score: number, snippet: string }>}
 */
export function search(query, maxResults = DEFAULT_MAX_RESULTS) {
  if (!_index) {
    return [];
  }

  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) {
    return [];
  }

  const { df, docLength, docs, totalDocs, avgDocLength } = _index;
  const scores = new Map(); // docId → cumulative score

  for (const term of queryTerms) {
    const posting = df.get(term);
    if (!posting) {
      continue;
    }

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
