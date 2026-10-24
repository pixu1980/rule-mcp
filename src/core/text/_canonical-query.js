/**
 * @module core/text/canonical-query
 *
 * The canonical form of a query, and the word lists it drops.
 *
 * This is text processing, so it lives with the rest of it. It sat in the BM25
 * module, where the cache imported it through that module's barrel - and the
 * barrel also carries the index builder, which needs the skill catalog, which
 * imports the tool families, which import the router. One import of a text
 * function therefore pulled the catalog and the updater into every cache
 * lookup. The tokenizer it uses still lives in `core/bm25/`; moving that is the
 * barrel-hygiene pass, not this one.
 */

import { MIN_TERM_LENGTH, splitWords, stem } from "../bm25/_terms.js";
import { STOPWORDS } from "../bm25/_stopwords.data.js";

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
function canonicalizeQuery(text) {
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

// The canonicalizer deliberately ships the scorer's stopwords too; add them
// here so the two lists never drift apart silently.
for (const word of STOPWORDS) {
  CANONICAL_STOPWORDS.add(word);
}

export { INTERROGATIVES, CANONICAL_STOPWORDS, canonicalizeQuery };
