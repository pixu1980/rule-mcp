import { maskLiterals } from "../../../src/core/guardrails/_util.js";

/** Guardrail `jsdoc-required`: JSDoc on every exported symbol */
export const jsdocRequired = {
  id: "jsdoc-required",
  label: "JSDoc on every exported symbol",
  description: "Every JS/TS file must have JSDoc on all exported functions, classes, constants, and types. Module-level JSDoc recommended.",
  check: (code, context) => {
    const fileName = context?.fileName || "";

    if (fileName === "index.js" || fileName === "index.ts") {
      return { pass: true, note: "Barrel file, skipping JSDoc check" };
    }

    const exportPatterns = [
      /export\s+(async\s+)?function\s+(\w+)/g,
      /export\s+(default\s+)?class\s+(\w+)/g,
      /export\s+(default\s+)?(const|let|var)\s+(\w+)/g,
      /export\s+default\s+(async\s+)?function\s+(\w+)/g,
      /export\s+default\s+(async\s+)?\w+/g,
    ];

    const missingDocs = [];
    const scannable = maskLiterals(code);

    for (const pattern of exportPatterns) {
      const re = new RegExp(pattern.source, "g");
      let match;

      while ((match = re.exec(scannable)) !== null) {
        const symbol = match.at(-1) || match[2] || "";

        if (!symbol) {
          continue;
        }
        // Adjacency, not a fixed window: a JSDoc block longer than the
        // window used to read as "missing", which failed every documented
        // export in this repository (finding F-A1).
        const before = scannable.slice(0, match.index).split("\n");
        let cursor = before.length - 1;

        while (cursor >= 0 && (before[cursor].trim() === "" || before[cursor].trimStart().startsWith("@"))) {
          cursor -= 1;
        }

        if (!before[cursor]?.trim().endsWith("*/")) {
          missingDocs.push(symbol);
        }
      }
    }

    if (missingDocs.length === 0) {
      return { pass: true, note: "All exported symbols have JSDoc" };
    }

    return {
      pass: false,
      failCount: missingDocs.length,
      detail: missingDocs.slice(0, 10).map((s) => `Missing JSDoc: ${s}`),
      suggestion: "Add JSDoc blocks before each exported symbol. Format: /** ... */ with @param and @returns where applicable.",
    };
  },
};
