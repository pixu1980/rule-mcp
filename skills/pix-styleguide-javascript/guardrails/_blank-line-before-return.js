/** Guardrail `js-blank-line-before-return`: Blank line before return statements */
import { countedVerdict } from "@rule-mcp/sdk";

export const jsBlankLineBeforeReturn = {
  id: "js-blank-line-before-return",
  label: "Blank line before return statements",
  description: "Every return statement must have a blank line before it (unless first in block).",
  check: (code) => {
    const issues = [];
    const lines = code.split("\n");

    for (let index = 1; index < lines.length; index++) {
      const line = lines[index].trim();
      const previous = lines[index - 1].trim();

      if (
        (line.startsWith("return ") || line === "return;") &&
        previous !== "" &&
        !previous.endsWith("{") &&
        !previous.endsWith("(") &&
        !previous.startsWith("//") &&
        !previous.startsWith("/*")
      ) {
        issues.push(`Line ${index + 1}: no blank line before return`);
      }
    }

    if (issues.length > 0) {
      return countedVerdict(issues, { suggestion: "Add a blank line before each return statement." });
    }

    return { pass: true };
  },
};
