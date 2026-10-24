

/** BM25 scoring and search entry points. */

import { K1, B, tokenize, DEFAULT_MAX_RESULTS } from "./_terms.js";
import { _index } from "./_state.js";

/**
 * The BM25 score for one query term in one document.
 *
 * @param {number} tf term frequency in the document
 * @param {number} docLen document length in tokens
 * @param {number} avgDocLen average document length
 * @param {number} N number of documents
 * @param {number} n number of documents containing the term
 * @returns {number}
 */
export function bm25Score(tf, docLen, avgDocLen, N, n) {
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
function search(query, maxResults = DEFAULT_MAX_RESULTS) {
  if (!_index) {
    return [];
  }

  const queryTerms = tokenize(query);

  if (queryTerms.length === 0) {
    return [];
  }

  const { df, docLength, docs, totalDocs, avgDocLength } = _index;
  const scores = new Map(); // docId -> cumulative score

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

/** Rank skills by how well they answer a query (per-skill rollup of search). */
function searchSkills(query, options = {}) {
  const results = search(query, options.maxSections ?? 200);

  if (results.length === 0) {
    return [];
  }

  const bySkill = new Map();

  for (const result of results) {
    if (!bySkill.has(result.skill)) {
      bySkill.set(result.skill, []);
    }

    bySkill.get(result.skill).push(result);
  }

  // How many of the query's terms this skill actually contains.
  //
  // IDF makes a term that appears in exactly one skill enormously valuable,
  // which is right for search and wrong for routing: "jwt verification best
  // practices" was routing to the one skill that happened to contain "jwt" in
  // an example, beating the skill that matched three terms out of four.
  // Nonsense did the same, matching a stray token in a regex sample.
  const queryTerms = new Set(tokenize(query));
  const coverage = (skill) => {
    if (queryTerms.size === 0) {
      return 0;
    }

    let matched = 0;

    for (const term of queryTerms) {
      const posting = _index.df.get(term);

      if (posting && [..._index.docs].some((document_) => document_.skill === skill && posting.has(document_.id))) {
        matched += 1;
      }
    }

    return matched / queryTerms.size;
  };

  return [...bySkill]
    .map(([skill, hits]) => {
      const sorted = hits.sort((a, b) => b.score - a.score);
      // Best section in full, the next ones at a decreasing share: corroboration
      // is worth something, repetition is not.
      const raw = sorted.reduce((total, hit, index) => total + hit.score / (index + 1), 0);

      return { skill, score: raw * coverage(skill), sections: sorted.slice(0, 5).map((hit) => hit.section) };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}
export { search, searchSkills };
