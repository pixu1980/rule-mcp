/** Guardrail `js-array-flat-map`: prefer flatMap over map().flat() */
export const jsArrayFlatMap = {
  id: "js-array-flat-map",
  label: "prefer flatMap over map().flat()",
  description: "rows.map(fn).flat() allocates an intermediate array; use rows.flatMap(fn) instead. Only .flat() with no depth argument is flagged.",
  check: (code) => {
    const violations = code.match(/\.map\s*\([^()]*(?:\([^()]*\))?[^()]*\)\s*\.flat\s*\(\s*\)/g) || [];

    if (violations.length === 0) {
      return { pass: true, note: "No map().flat() chains found" };
    }

    return {
      pass: false,
      failCount: violations.length,
      detail: violations.slice(0, 5),
      suggestion: "Use Array.prototype.flatMap: rows.flatMap(r => r.cells).",
    };
  },
};
