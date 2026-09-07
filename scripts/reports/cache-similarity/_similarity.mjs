/** @module scripts/reports/cache-similarity/similarity - variants, term sets and jaccard */

const { canonicalizeQuery } = await import("../../../src/core/bm25/index.js");

/**
 * What a second person plausibly types for the same question.
 *
 * Deliberately not paraphrases: each variant keeps the words and changes the
 * framing, which is the case a similarity tier is supposed to catch and the
 * hardest case to distinguish from a different question.
 *
 * @param {string} prompt
 * @returns {string[]}
 */
export function variants(prompt) {
  const words = prompt.trim().split(/\s+/);

  return [words.slice(0, -1).join(" "), `${prompt} in my project`, words.slice(1).join(" "), `${words.slice(0, -1).join(" ")} best approach`].filter(
    (variant) => variant.trim().split(/\s+/).length >= 2,
  );
}

export const terms = (text) => new Set(canonicalizeQuery(text).split(" ").filter(Boolean));

/** @param {Set<string>} a @param {Set<string>} b @returns {number} */
export function jaccard(a, b) {
  const union = new Set([...a, ...b]);
  if (union.size === 0) {
    return 0;
  }

  return [...a].filter((term) => b.has(term)).length / union.size;
}
