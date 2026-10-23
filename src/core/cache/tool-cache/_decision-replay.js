

/** The opt-in L3 replay: a model-chosen cached core, returned before compute. */
import { cacheGet } from "./_entries.js";
import { evaluateDecision } from "./_decision-evaluate.js";
import { replayEnabled, shadowThreshold } from "./_decision-gate-env.js";
import { NON_CACHEABLE } from "./_state.js";

/**
 * Ask the decision gate whether a cached call can answer this one, and return
 * that cached core only when the model chose it above the floor and every hard
 * guard passed. Any failure is a miss, never an error.
 *
 * @param {string} toolName
 * @param {object} args
 * @returns {Promise<{ result: object, tier: "decision", meta: object }|undefined>}
 */
export async function cacheLookupDecision(toolName, args) {
  if (!replayEnabled() || NON_CACHEABLE.has(toolName)) {
    return;
  }

  try {
    const evaluated = await evaluateDecision(toolName, args, shadowThreshold());
    const decision = evaluated?.decision;

    if (!decision?.wouldReplay) {
      return;
    }

    const candidate = decision.candidate;
    const result = cacheGet(candidate.key);

    if (!result) {
      return;
    }

    return {
      result,
      tier: "decision",
      meta: { choice: candidate.label, probability: decision.probability },
    };
  } catch {
    return;
  }
}
