

/**
 * @module core/decision/registry
 *
 * The decision models this server may ask, and the probability each needs
 * before its pick replaces the BM25 answer.
 *
 * A threshold is per model because the audit measured that confidence is not
 * comparable across models: Laya's correct shortlist picks sat at 0.067-0.332,
 * so a 0.5 cutoff would never have fired. The value is a floor for the override,
 * not a probability claim about the model.
 */

/** The models a caller may name by id or alias. */
export const DECISION_MODELS = Object.freeze({
  "ggml-org/Laya-GGUF": Object.freeze({
    id: "ggml-org/Laya-GGUF",
    alias: "laya",
    threshold: 0.05,
    languages: Object.freeze(["en"]),
    shortlist: 6,
  }),
  // The multilingual entry: the installed id is filled in when Julia-1 is.
  "julia-1": Object.freeze({
    id: "julia-1",
    alias: "julia",
    threshold: 0.05,
    languages: Object.freeze(["en", "it"]),
    shortlist: 6,
  }),
});

/**
 * Resolve an id or an alias to one registry entry.
 *
 * @param {string | undefined} id
 * @returns {(typeof DECISION_MODELS)[keyof typeof DECISION_MODELS] | null}
 */
export function resolveDecisionModel(id) {
  if (typeof id !== "string" || id.length === 0) {
    return null;
  }

  if (DECISION_MODELS[id]) {
    return DECISION_MODELS[id];
  }

  return Object.values(DECISION_MODELS).find((entry) => entry.alias === id) ?? null;
}
