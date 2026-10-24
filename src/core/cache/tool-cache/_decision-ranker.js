/** BM25 ranking for decision-cache candidates. */
import { bm25Score } from "../../bm25/_score.js";
import { tokenize } from "../../bm25/_terms.js";
import { compare } from "./_decision-identity.js";

/** Five candidates plus none keep the choice inside the model's measured cap. */
export const CANDIDATE_CAP = 5;

function frequencies(tokens) {
  const freq = new Map();

  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }

  return freq;
}

/**
 * Rank the cached prompts with BM25: term frequency saturates, the document
 * length normalizes, and IDF discounts terms every seed contains. Ties stay
 * deterministic by key, then prompt.
 *
 * @param {string} query
 * @param {Array<{ key: string, prompt: string } & Record<string, unknown>>} descriptors
 * @param {number} [cap]
 * @returns {Array<object>}
 */
export function rankCandidates(query, descriptors, cap = CANDIDATE_CAP) {
  const queryTerms = [...new Set(tokenize(query))];

  if (queryTerms.length === 0) {
    return [];
  }

  const docs = [];

  for (const descriptor of descriptors) {
    const tokens = tokenize(descriptor.prompt ?? "");

    if (tokens.length > 0) {
      docs.push({ ...descriptor, freq: frequencies(tokens), length: tokens.length });
    }
  }

  if (docs.length === 0) {
    return [];
  }

  const df = new Map();

  for (const doc of docs) {
    for (const term of doc.freq.keys()) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const total = docs.length;
  const avgdl = docs.reduce((sum, doc) => sum + doc.length, 0) / total;

  return docs
    .map(({ freq, length, ...doc }) => {
      let score = 0;

      for (const term of queryTerms) {
        const tf = freq.get(term) ?? 0;

        if (tf > 0) {
          score += bm25Score(tf, length, avgdl, total, df.get(term) ?? 0);
        }
      }

      return { ...doc, score: Math.round(score * 1000) / 1000 };
    })
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score || compare(a.key, b.key) || compare(a.prompt, b.prompt))
    .slice(0, cap);
}
