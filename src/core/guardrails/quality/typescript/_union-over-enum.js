

import { stripLiterals } from "../_guards-meta.js";
import { countedVerdict, tsSkipResult } from "../../../../shared/index.js";

/** Guardrail `ts-union-over-enum`: Union types over enum */
export const tsUnionOverEnum = {
  id: "ts-union-over-enum",
  label: "Union types over enum",
  description: "An enum emits runtime code and numeric enums reverse-map. A string union compiles to nothing and autocompletes the same.",
  check: (code, context) => {
    const skip = tsSkipResult(code, context);

    if (skip) {
      return skip;
    }

    const hits = stripLiterals(code).match(/^\s*(?:export\s+)?(?:const\s+)?enum\s+(\w+)/gm) ?? [];

    return countedVerdict(hits, { maxDetail: 10, trim: true, suggestion: "Use a string union, plus `as const` array and `typeof ARR[number]` when the values must be iterated." });
  },
};
