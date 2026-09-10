

/** Guardrail `js-if-braces`: if/else always use braces */
import { countedVerdict } from "../../../../shared/index.js";
export const jsIfBraces = {
  id: "js-if-braces",
  label: "if/else always use braces",
  description: "Every if, else, else if must use {} braces. Single-line if without braces is forbidden.",
  check: (code) => {
    // Line-oriented on purpose. Balancing parentheses means counting the
    // ones inside regex literals too, and a condition like
    // `/\([^)]*\)/.test(line)` then reads as a braceless if (finding F-A1).
    const offenders = [];
    const lines = code.split("\n");
    for (const [index, raw] of lines.entries()) {
      const line = raw.trim();
      if (!/\bif\s*\(/.test(line) || line.startsWith("*") || line.startsWith("//")) {
        continue;
      }
      if (line.endsWith("{") || /[&|(,+]$/.test(line)) {
        continue;
      }
      if (line.endsWith(")")) {
        const next = lines.slice(index + 1).find((candidate) => candidate.trim() !== "");
        if (next?.trim().startsWith("{")) {
          continue;
        }
      }
      offenders.push(line);
    }
    if (offenders.length > 0) {
      return countedVerdict(offenders, { suggestion: "Add braces: if (condition) { ... }" });
    }

    return { pass: true };
  },
};
