// Auto-split from src/core/bm25.js - see ./bm25/index.js
/** Full English stopword table (union of the two halves). */
import { CANONICAL_STOPWORDS } from "./stopwords.js";
import { STOPWORDS_A } from "./stopwords-a.js";
import { STOPWORDS_B } from "./stopwords-b.js";

export const STOPWORDS = new Set([...STOPWORDS_A, ...STOPWORDS_B]);

// The canonicalizer deliberately ships the scorer's stopwords too; add them
// once the scorer's list exists so the two never drift apart silently.
for (const word of STOPWORDS) {
  CANONICAL_STOPWORDS.add(word);
}
