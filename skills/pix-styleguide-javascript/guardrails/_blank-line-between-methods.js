/** Guardrail `js-blank-line-between-methods`: Blank line between class methods */

export const jsBlankLineBetweenMethods = {
  id: "js-blank-line-between-methods",
  label: "Blank line between class methods",
  description: "Every pair of class methods must have a blank line between them.",
  check: (code, { helpers: { countedVerdict } }) => {
    const issues = [];

    if (!code.includes("class ")) {
      return { pass: true, note: "Not a class - skipping" };
    }

    const lines = code.split("\n");

    for (let index = 0; index < lines.length - 1; index++) {
      // Check if line is a closing brace of a method, followed by another method
      if (/^\s*\}\s*$/.test(lines[index]) && /^\s*(\w+|static|get|set)\s/.test(lines[index + 1])) {
        issues.push(`Line ${index + 1}: no blank line before method`);
      }
    }

    if (issues.length > 0) {
      return countedVerdict(issues, { suggestion: "Add a blank line between class methods." });
    }

    return { pass: true };
  },
};
