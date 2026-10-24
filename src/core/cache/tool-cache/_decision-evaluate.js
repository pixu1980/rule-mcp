/** One decision evaluation shared by the shadow observer and the opt-in replay. */
import { decisionCache } from "../../decision/_cache.js";
import { rerankShortlist } from "../../decision/_rerank.js";
import { decisionRuntime, resolveRuntimeModel } from "../../decision/_runtime.js";
import { buildDecisionCandidates, nonPromptArgs } from "./_decision-candidates.js";
import { buildGateQuestion, buildGateState, decideShadow, GATE_INSTRUCTIONS, NONE_DESCRIPTION, NONE_LABEL, SHADOW_THRESHOLD } from "./_decision-protocol.js";
import { promptOf } from "./_nyx-annotate.js";
import { cacheEnabled } from "./_config.js";

/**
 * Build the candidates, ask the model (or its cache), and return the decision.
 * A miss is a reason, never an exception: the caller decides whether to record
 * it in shadow or to compute.
 *
 * @param {string} toolName
 * @param {object} args
 * @param {number} [threshold]
 * @returns {Promise<object|null>}
 */
export async function evaluateDecision(toolName, args, threshold = SHADOW_THRESHOLD) {
  if (!cacheEnabled()) {
    return null;
  }

  const prompt = promptOf(toolName, args);

  if (!prompt) {
    return null;
  }

  const candidates = buildDecisionCandidates(toolName, args);

  if (candidates.length === 0) {
    return { prompt, candidates, reason: "no-candidates" };
  }

  const model = resolveRuntimeModel(prompt);

  if (!model) {
    return { prompt, candidates, reason: "no-model" };
  }

  // The multilingual model's cache answers were overconfident on the corpus
  // (ADR 163): keep it on routing and leave the cache gate to the English model.
  if (model.alias === "julia") {
    return null;
  }

  const state = buildGateState({ toolName, args, livePrompt: prompt, candidates });
  const shortlist = candidates.map(({ label, description }) => ({ skill: label, description }));

  shortlist.push({ skill: NONE_LABEL, description: NONE_DESCRIPTION });

  const questions = buildGateQuestion(candidates);
  const key = decisionCache.key({ model: model.id, state, questions });
  const hit = decisionCache.read(key);
  let rerank = hit;

  try {
    if (!rerank) {
      const runtime = await decisionRuntime(prompt);

      if (!runtime) {
        return { prompt, candidates, model, reason: "no-model" };
      }

      rerank = await rerankShortlist({
        prompt: state,
        shortlist,
        ask: runtime.supervisor.ask,
        model: runtime.model.id,
        instructions: GATE_INSTRUCTIONS,
      });
    }
  } catch {
    return { prompt, candidates, model, reason: "model-error" };
  }

  const decision = decideShadow({
    answer: rerank,
    candidates,
    live: { argsKey: nonPromptArgs(toolName, args) },
    threshold,
  });

  return { prompt, candidates, model, decision, decisionCacheHit: Boolean(hit) };
}
