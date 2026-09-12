/** Guardrail `ts-no-explicit-any`: No explicit any */
import { countedVerdict, stripLiterals, tsSkipResult } from "@rule-mcp/sdk";

export const tsNoExplicitAny = {
  id: "ts-no-explicit-any",
  label: "No explicit any",
  description: "any turns off checking exactly where a value is least understood. Use unknown and narrow it.",
  check: (code, context) => {
    const skip = tsSkipResult(code, context);

    if (skip) {
      return skip;
    }

    const hits = stripLiterals(code).match(/(?::\s*any\b|\bas\s+any\b|<any>|\bany\[\]|Array<any>)/g) ?? [];

    return countedVerdict([...new Set(hits.map((h) => h.trim()))], {
      maxDetail: 10,
      suggestion: "Replace any with unknown and narrow it with a type guard, or write the real type.",
    });
  },
};
