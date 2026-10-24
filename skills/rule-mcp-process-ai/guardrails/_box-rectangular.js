/** Guardrail `fp-box-rectangular`: A drawn box is a rectangle */

export const fpBoxRectangular = {
  id: "ai-box-rectangular",
  label: "A drawn box is a rectangle",
  description: "Every line of a box ends in the same column. A right edge that steps in and out is the one tell a spell-check cannot see.",
  check: (code, { helpers: { findRaggedBoxes } }) => {
    const ragged = findRaggedBoxes(code);

    return {
      pass: ragged.length === 0,
      failCount: ragged.length,
      detail: ragged
        .slice(0, 10)
        .map((entry) => (entry.reason === "box never closes" ? `line ${entry.line}: box never closes` : `line ${entry.line}: ${entry.width} columns, expected ${entry.expected}`)),
      suggestion: "Pad the short lines out to the widest line of the same box, or run rule_tool_compress.",
    };
  },
};
