/** Guardrail `no-suppressed-errors`: No suppressed type, lint, or runtime errors */
export const noSuppressedErrors = {
  id: "no-suppressed-errors",
  label: "No suppressed type, lint, or runtime errors",
  description: "Generated code must not silence errors with ignore directives or empty catch blocks.",
  check: (code) => {
    const patterns = [/@ts-ignore/g, /eslint-disable/g, /biome-ignore/g, /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g];
    const violations = patterns.flatMap((pattern) => code.match(pattern) || []);

    return {
      pass: violations.length === 0,
      failCount: violations.length,
      detail: violations.slice(0, 10),
      suggestion: "Handle errors explicitly and fix type/lint violations instead of suppressing them.",
    };
  },
};
