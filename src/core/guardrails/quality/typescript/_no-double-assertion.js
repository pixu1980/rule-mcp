import { isTypeScript, stripLiterals } from "../_guards-meta.js";

/** Guardrail `ts-no-double-assertion`: No as-unknown-as escape hatch */
export const tsNoDoubleAssertion = {
  id: "ts-no-double-assertion",
  label: "No as-unknown-as escape hatch",
  description: "A double assertion silences the compiler twice over: it defeats both the original type and the check that would have caught the mismatch.",
  check: (code, context) => {
    if (!isTypeScript(code, context)) {
      return { pass: true, note: "Not a TypeScript file, skipping" };
    }

    const hits = stripLiterals(code).match(/\bas\s+unknown\s+as\b/g) ?? [];

    return {
      pass: hits.length === 0,
      failCount: hits.length,
      detail: hits.slice(0, 10),
      suggestion: "Write a type guard that does a real runtime check, or fix the type the value actually has.",
    };
  },
};
