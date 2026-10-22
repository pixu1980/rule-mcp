

/**
 * @module tools/ai/decision
 *
 * The gated second opinion for `pix_tool`.
 *
 * BM25 already chose six candidates. The model is asked one `choice` over those
 * six, and its pick replaces the ranker only when the probability clears the
 * registry threshold for that model. Any transport or lifecycle failure returns
 * null, so the caller keeps the BM25 answer and the request path never depends
 * on a model being resident.
 */

import { rerankShortlist } from "../../core/decision/_rerank.js";
import { decisionRuntime } from "../../core/decision/_runtime.js";
import { getSkillMetadata } from "../router/index.js";

/** The BM25 uncertainty floor, used only while no model has an opinion. */
const ABSOLUTE_THRESHOLD = 5;

/** The BM25 answer, in the shape the caller always receives. */
function bm25Decision(primaryRoute, uncertain = primaryRoute.absoluteScore < ABSOLUTE_THRESHOLD) {
  return { skill: primaryRoute.skill, confidence: primaryRoute.relativeScore, uncertain };
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
  let runtime;

  try {
    runtime = decisionRuntime();
  } catch {
    return bm25Decision(primaryRoute);
  }

  if (!runtime) {
    return bm25Decision(primaryRoute);
  }

  const shortlist = top.map((entry) => ({
    skill: entry.skill,
    description: String(getSkillMetadata(entry.skill)?.description ?? ""),
  }));

  try {
    const rerank = await rerankShortlist({ prompt, shortlist, ask: runtime.supervisor.ask });
    const chosen = shortlist.find((option) => option.skill === rerank.pick);

    if (chosen && rerank.probability >= runtime.model.threshold) {
      return { skill: chosen.skill, confidence: rerank.probability, uncertain: false };
    }

    return bm25Decision(primaryRoute, true);
  } catch {
    return bm25Decision(primaryRoute);
  }
}
