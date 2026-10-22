

/**
 * @module core/decision/rerank
 *
 * One `choice` over the BM25 shortlist, and the probability of the label the
 * model picked.
 *
 * The cap is here, not in the caller: 83 options made the model confidently
 * wrong in the audit, so a shortlist that grew past six is refused before a
 * request is sent. The model never sees a skill the ranker did not already
 * consider.
 */

import { DecisionSupervisorError } from "./_errors.js";

/** The most options one decision request may carry. */
export const SHORTLIST_CAP = 6;

/**
 * Build the one question the reranker asks.
 *
 * @param {Array<{ skill: string, description?: string }>} shortlist
 * @returns {{ pick: { type: "choice", instructions: string, criteria: Record<string, string> } }}
 */
export function buildChoiceQuestion(shortlist) {
  if (!Array.isArray(shortlist) || shortlist.length === 0) {
    throw new DecisionSupervisorError("decision shortlist needs at least one option", { code: "shortlist" });
  }

  if (shortlist.length > SHORTLIST_CAP) {
    throw new DecisionSupervisorError(`decision shortlist caps at six options, got ${shortlist.length}`, {
      code: "shortlist",
    });
  }

  return {
    pick: {
      type: "choice",
      instructions: "Which skill should answer this request?",
      criteria: Object.fromEntries(shortlist.map(({ skill, description }) => [skill, description ?? ""])),
    },
  };
}

/**
 * The probability the endpoint attached to one label.
 *
 * A missing distribution is zero, not a guess: a model that answered without
 * probabilities cannot clear a threshold.
 *
 * @param {{ answers?: { pick?: { probabilities?: Record<string, number> } } }} answer
 * @param {string | null} pick
 * @returns {number}
 */
export function probabilityOf(answer, pick) {
  const probabilities = answer?.answers?.pick?.probabilities ?? {};

  return typeof probabilities[pick] === "number" ? probabilities[pick] : 0;
}

/**
 * Ask the model to choose one shortlist label and return its probability.
 *
 * @param {{
 *   prompt: string,
 *   shortlist: Array<{ skill: string, description?: string }>,
 *   ask: (prompt: string, questions: object) => Promise<any>,
 * }} options
 * @returns {Promise<{ pick: string | null, probability: number, answers: object, usage: object, ms: number }>}
 */
export async function rerankShortlist({ prompt, shortlist, ask }) {
  const questions = buildChoiceQuestion(shortlist);
  const answer = await ask(prompt, questions);
  const value = answer?.answers?.pick;
  const pick = typeof value === "string" ? value : (value?.choice ?? null);

  return {
    pick,
    probability: probabilityOf(answer, pick),
    answers: answer?.answers ?? {},
    usage: answer?.usage ?? {},
    ms: answer?.ms ?? 0,
  };
}
