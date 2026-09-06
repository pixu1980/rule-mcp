/** Guardrail `no-future-use-code`: No code kept for an imagined future */
export const noFutureUseCode = {
  id: "no-future-use-code",
  label: "No code kept for an imagined future",
  description:
    'Markers like "for future use", "in case we need", or "just in case" mark code written for a requirement that does not exist yet.',
  check: (code) => {
    const markers =
      code.match(
        /(?:for future use|for now unused|not used yet|in case we (?:need|want)|might need (?:it|this|them) later|will be needed later|just in case|reserved for future|future-proof(?:ing|ed)?|placeholder for future)/gi,
      ) || [];

    return {
      pass: markers.length === 0,
      failCount: markers.length,
      detail: [...new Set(markers)].slice(0, 10),
      suggestion: "Delete the speculative code. Write it when the requirement arrives - version control remembers.",
    };
  },
};
