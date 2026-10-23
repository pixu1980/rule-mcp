

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
    size: 421_000_000,
    context: 8192,
    threshold: 0.05,
    languages: Object.freeze(["en"]),
    shortlist: 6,
  }),
  // The multilingual entry, installed as ggml-org/Julia-1-GGUF:Q8_0 on llama.cpp.
  "ggml-org/Julia-1-GGUF:Q8_0": Object.freeze({
    id: "ggml-org/Julia-1-GGUF:Q8_0",
    alias: "julia",
    size: 144_000_000,
    context: 8192,
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

/** The first registry entry that covers a language, or null. */
export function modelForLanguage(language) {
  return Object.values(DECISION_MODELS).find((entry) => entry.languages.includes(language)) ?? null;
}

/**
 * Whether a model's context can hold its shortlist.
 *
 * A description costs roughly 128 tokens per option, so a model with 8192
 * context holds the six-option cap with room for the prompt. The check is what
 * makes a registry entry with a tiny context a fallback instead of a failure.
 *
 * @param {{ context: number, shortlist: number } | null} model
 * @param {number} [options]
 * @returns {boolean}
 */
export function modelFits(model, options = 0) {
  if (!model) {
    return false;
  }

  const count = Number.isInteger(options) ? options : 0;

  return model.shortlist >= count && model.context >= count * 128;
}
