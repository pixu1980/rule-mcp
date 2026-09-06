/** @module core/guardrails/backend/cors-explicit */

export const corsExplicit = {
  id: "cors-explicit",
  label: "CORS configured with explicit origins",
  description: "CORS must not use wildcard origin (*). Specify explicit allowed origins.",
  check: (code) => {
    // `cors(` with any arguments, not only the empty call: the wildcard is
    // almost always written as cors({ origin: "*" }), which the narrower
    // pattern skipped entirely.
    const hasCors = /cors\(|@fastify\/cors|app\.enableCors/i.test(code);

    if (!hasCors) {
      return { pass: true, note: "CORS not configured, skipping" };
    }

    const isCorsWildcard = /origin:\s*["']\*["']/gi.test(code);

    return {
      pass: !isCorsWildcard,
      failCount: isCorsWildcard ? 1 : 0,
      detail: isCorsWildcard ? ["Wildcard origin (*) found"] : [],
      suggestion: "Replace origin: '*' with an explicit allowlist of allowed origins.",
    };
  },
};
