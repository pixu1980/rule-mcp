

/** Guardrail `js-for-loop-braces`: for loops must have braces and be multi-line */
import { countedVerdict } from "../../../../shared/index.js";
export const jsForLoopBraces = {
  id: "js-for-loop-braces",
  label: "for loops must have braces and be multi-line",
  description: "Every for/for...of/for...in body must use {} and span multiple lines. No for (...) stmt;",
  check: (code) => {
    // Judged per line: a two-line for over a single statement must not read
    // as a one-liner once the surrounding newlines are trimmed (F-A1).
    const filtered = [];
    const scannable = code.split("\n").filter((l) => l.length > 0 && l.length <= 2000);

    for (const line of scannable) {
      for (const m of line.match(/for\s*\([^)]*\)\s*\{[^}]+\}/g) ?? []) {
        const inner = m
          .replace(/^for\s*\([^)]*\)\s*\{/, "")
          .replace(/\}$/, "")
          .trim();

        if (inner.length > 0) {
          filtered.push(m);
        }
      }
    }

    if (filtered.length > 0) {
      return countedVerdict(filtered, { suggestion: "Place for loop body on separate lines." });
    }

    return { pass: true };
  },
};
