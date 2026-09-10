

/** Phrases that mark a prompt as a scope challenge rather than a build request. */
const REDUCTION_SIGNALS = [
  "over engineering",
  "over-engineering",
  "over engineered",
  "over-engineered",
  "overengineer",
  "unnecessary complexity",
  "reduce complexity",
  "simplify",
  "simpler",
  "smaller footprint",
  "can we avoid",
  "do we need",
  "is it required",
  "not in our scope",
  "out of scope",
  "too much",
  "too many",
  "too hard",
  "keep it minimal",
  "remove",
  "redundant",
  "yagni",
  "should i extract",
  "should i abstract",
  "should i split",
  "worth extracting",
  "into a helper",
  "separate module",
  "own abstraction",
  "premature",
];

/** @param {string} promptLower @returns {string|null} */
export function reductionSignal(promptLower) {
  return REDUCTION_SIGNALS.find((signal) => promptLower.includes(signal)) ?? null;
}
