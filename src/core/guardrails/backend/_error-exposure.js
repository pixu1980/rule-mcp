/** @module core/guardrails/backend/error-exposure */

export const errorExposure = {
  id: "error-exposure",
  label: "No internal error details in responses",
  description: "Production error responses must not expose stack traces or internal error messages.",
  check: (code) => {
    // The receiver is whatever the handler called it: `res`, `response`, `reply`.
    // Same shape as sql-injection above: `.json(` is the anchor rather than the
    // name the handler gave its response, and the spans are bounded.
    const patterns = [
      /\.(?:status|json|send)\([^;\n]{0,200}\b(?:err|error|e)\.stack/gi,
      /\.json\(\{[\t ]{0,4}error:[\t ]{0,4}(?:err|error|e)\.message/gi,
      /\.send\((?:err|error|e)\.message\)/gi,
    ];
    const violations = [];

    for (const re of patterns) {
      const m = code.match(re);

      if (m) {
        violations.push(...m);
      }
    }

    return {
      pass: violations.length === 0,
      failCount: violations.length,
      detail: violations.slice(0, 5),
      suggestion:
        "Return generic messages: res.status(500).json({ error: 'Internal server error' }). Log details server-side only.",
    };
  },
};
