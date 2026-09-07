/** Guardrail `js-no-array-for-each`: for...of over Array.forEach() */
export const jsNoArrayForEach = {
  id: "js-no-array-for-each",
  label: "for...of over Array.forEach()",
  description: "Prefer for...of loops over Array.prototype.forEach: better type narrowing, direct await, and break/continue support.",
  check: (code) => {
    const violations = code.match(/\b\w+\.forEach\s*\(/g) || [];

    if (violations.length === 0) {
      return { pass: true, note: "No .forEach() calls found" };
    }

    return {
      pass: false,
      failCount: violations.length,
      detail: violations.slice(0, 5),
      suggestion: "Rewrite .forEach() as a for...of loop: for (const item of items) { ... }.",
    };
  },
};
