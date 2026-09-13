/** Guardrail `js-no-blank-lines-in-blocks`: No blank line immediately after { or before } */

export const jsNoBlankLinesInBlocks = {
  id: "js-no-blank-lines-in-blocks",
  label: "No blank line immediately after { or before }",
  description: "Blocks must not have blank lines at start or end: {\n\ncode → forbidden. code\n\n} → forbidden.",
  check: (code, { helpers: { countedVerdict } }) => {
    const issues = [];
    const lines = code.split("\n");

    for (let index = 0; index < lines.length; index++) {
      if (/\{\s*$/.test(lines[index]) && index + 1 < lines.length && /^\s*$/.test(lines[index + 1])) {
        issues.push(`Line ${index + 1}: blank line after {`);
      }

      if (/^\s*\}\s*$/.test(lines[index]) && index > 0 && /^\s*$/.test(lines[index - 1])) {
        issues.push(`Line ${index + 1}: blank line before }`);
      }
    }

    if (issues.length > 0) {
      return countedVerdict(issues, { suggestion: "Remove blank lines at block start/end." });
    }

    return { pass: true };
  },
};
