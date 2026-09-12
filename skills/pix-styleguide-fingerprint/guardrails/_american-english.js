import { findFingerprints } from "../../../src/core/text/fingerprint/index.js";

/** Guardrail `fp-american-english`: American English spelling */
export const fpAmericanEnglish = {
  id: "fp-american-english",
  label: "American English spelling",
  description: "The house style is American English: -or over -our, -ize over -ise, -er over -re, -og over -ogue.",
  check: (code) => {
    const { british } = findFingerprints(code);

    return {
      pass: british.length === 0,
      failCount: british.length,
      detail: british.slice(0, 10),
      suggestion: "Use the American spelling. Identifiers from third-party APIs are exempt - put them in a code span or leave them in code.",
    };
  },
};
