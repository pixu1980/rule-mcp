import { isTypeScript, stripLiterals } from "../_guards-meta.js";

/** Guardrail `ts-catch-unknown`: Catch clauses use unknown */
export const tsCatchUnknown = {
  id: "ts-catch-unknown",
  label: "Catch clauses use unknown",
  description: "JavaScript can throw anything - a string, null, an object that is not an Error. any lets the handler assume otherwise and crash.",
  check: (code, context) => {
    if (!isTypeScript(code, context)) {
      return { pass: true, note: "Not a TypeScript file, skipping" };
    }
    const hits = stripLiterals(code).match(/catch\s*\(\s*\w+\s*:\s*any\s*\)/g) ?? [];

    return {
      pass: hits.length === 0,
      failCount: hits.length,
      detail: hits.slice(0, 10),
      suggestion: "Type the catch variable as unknown and check with instanceof before touching it. strict mode already does this.",
    };
  },
};
