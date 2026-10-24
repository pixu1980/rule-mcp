/**
 * @module tools/ai/decision
 *
 * The gated second opinion for `rule_tool`.
 *
 * BM25 already chose six candidates. The model is asked one `choice` over those
 * six, and its pick replaces the ranker only when the probability clears the
 * registry threshold for that model. Any transport or lifecycle failure returns
 * null, so the caller keeps the BM25 answer and the request path never depends
 * on a model being resident.
 */

import { decisionCache } from "../../core/decision/_cache.js";
import { buildChoiceQuestion, rerankShortlist } from "../../core/decision/_rerank.js";
import { decisionRuntime, resolveRuntimeModel } from "../../core/decision/_runtime.js";
import { getSkillMetadata } from "../router/index.js";

/** The BM25 uncertainty floor, used only while no model has an opinion. */
const ABSOLUTE_THRESHOLD = 5;

/** The BM25 answer, in the shape the caller always receives. */
function bm25Decision(primaryRoute, uncertain = primaryRoute.absoluteScore < ABSOLUTE_THRESHOLD) {
  return { skill: primaryRoute.skill, confidence: primaryRoute.relativeScore, uncertain };
}

/** The model's pick once it clears its threshold, else the BM25 answer. */
function decide(rerank, shortlist, model, primaryRoute) {
  const chosen = shortlist.find((option) => option.skill === rerank.pick);

  if (chosen && rerank.probability >= model.threshold) {
    return { skill: chosen.skill, confidence: rerank.probability, uncertain: false };
  }

  return bm25Decision(primaryRoute, true);
}

/**
 * @param {{
 *   prompt: string,
 *   top: Array<{ skill: string, relativeScore: number, sections: string[] }>,
 *   primaryRoute: { skill: string, relativeScore: number, sections: string[] },
 * }} request
 * @returns {Promise<{ skill: string, confidence: number, uncertain: boolean }>}
 */
export async function applyDecision({ prompt, top, primaryRoute }) {
  const model = resolveRuntimeModel(prompt);

  if (!model) {
    return bm25Decision(primaryRoute);
  }

  const shortlist = top.map((entry) => ({
    skill: entry.skill,
    description: String(getSkillMetadata(entry.skill)?.description ?? ""),
  }));
  let cached;

  try {
    const questions = buildChoiceQuestion(shortlist);
    cached = decisionCache.read(decisionCache.key({ model: model.id, state: prompt, questions }));
  } catch {
    return bm25Decision(primaryRoute);
  }

  // Answer before the supervisor exists: a hit must not load, unload or swap a model.
  if (cached) {
    return decide(cached, shortlist, model, primaryRoute);
  }

  let runtime;

  try {
    runtime = await decisionRuntime(prompt);
  } catch {
    return bm25Decision(primaryRoute);
  }

  if (!runtime) {
    return bm25Decision(primaryRoute);
  }

  try {
    const rerank = await rerankShortlist({
      prompt,
      shortlist,
      ask: runtime.supervisor.ask,
      model: runtime.model.id,
    });

    return decide(rerank, shortlist, runtime.model, primaryRoute);
  } catch {
    return bm25Decision(primaryRoute);
  }
}
