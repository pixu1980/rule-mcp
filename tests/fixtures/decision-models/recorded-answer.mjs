

/**
 * @module tests/fixtures/decision-models/recorded-answer
 *
 * The audit's control run on Laya: the billing state, one route question,
 * 42 ms and 67 input tokens, route billing at 0.9917. Only the chosen label's
 * probability was quoted, so the fixture does not invent the others.
 */
export const RECORDED_DECISION = {
  answers: { pick: { choice: "billing", probabilities: { billing: 0.9917 } } },
  usage: { input_tokens: 67 },
  ms: 42,
};
