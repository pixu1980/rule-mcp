import { isTypeScript, stripLiterals } from "../_guards-meta.js";

/** Guardrail `ts-no-explicit-any`: No explicit any */
export const tsNoExplicitAny = {
  id: "ts-no-explicit-any",
  label: "No explicit any",
  description: "any turns off checking exactly where a value is least understood. Use unknown and narrow it.",
  check: (code, context) => {
    if (!isTypeScript(code, context)) {
      return { pass: true, note: "Not a TypeScript file, skipping" };
    }

    const hits = stripLiterals(code).match(/(?::\s*any\b|\bas\s+any\b|<any>|\bany\[\]|Array<any>)/g) ?? [];

    return {
      pass: hits.length === 0,
      failCount: hits.length,
      detail: [...new Set(hits.map((h) => h.trim()))].slice(0, 10),
      suggestion: "Replace any with unknown and narrow it with a type guard, or write the real type.",
    };
  },
};
