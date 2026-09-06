import { isTypeScript, stripLiterals } from "../_guards-meta.js";

/** Guardrail `ts-union-over-enum`: Union types over enum */
export const tsUnionOverEnum = {
  id: "ts-union-over-enum",
  label: "Union types over enum",
  description:
    "An enum emits runtime code and numeric enums reverse-map. A string union compiles to nothing and autocompletes the same.",
  check: (code, context) => {
    if (!isTypeScript(code, context)) {
      return { pass: true, note: "Not a TypeScript file, skipping" };
    }

    const hits = stripLiterals(code).match(/^\s*(?:export\s+)?(?:const\s+)?enum\s+(\w+)/gm) ?? [];

    return {
      pass: hits.length === 0,
      failCount: hits.length,
      detail: hits.map((h) => h.trim()).slice(0, 10),
      suggestion:
        "Use a string union, plus `as const` array and `typeof ARR[number]` when the values must be iterated.",
    };
  },
};
