// Auto-split from src/core/guardrails/quality.js - see ./quality/index.js

import { findFingerprints } from "../../fingerprint.js";
import { isTypeScript, stripLiterals } from "./guards-meta.js";

export const QUALITY_GUARDRAILS_PART1 = [
  {
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
  },
  {
    id: "ts-catch-unknown",
    label: "Catch clauses use unknown",
    description:
      "JavaScript can throw anything - a string, null, an object that is not an Error. any lets the handler assume otherwise and crash.",
    check: (code, context) => {
      if (!isTypeScript(code, context)) {
        return { pass: true, note: "Not a TypeScript file, skipping" };
      }
      const hits = stripLiterals(code).match(/catch\s*\(\s*\w+\s*:\s*any\s*\)/g) ?? [];

      return {
        pass: hits.length === 0,
        failCount: hits.length,
        detail: hits.slice(0, 10),
        suggestion:
          "Type the catch variable as unknown and check with instanceof before touching it. strict mode already does this.",
      };
    },
  },
  {
    id: "ts-no-double-assertion",
    label: "No as-unknown-as escape hatch",
    description:
      "A double assertion silences the compiler twice over: it defeats both the original type and the check that would have caught the mismatch.",
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
  },
  {
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
  },
  {
    id: "fp-no-emdash",
    label: "No em or en dashes",
    description: "Prose uses ASCII punctuation. An em dash becomes a comma; an en dash becomes a hyphen.",
    check: (code) => {
      const { dashes } = findFingerprints(code);

      return {
        pass: dashes.length === 0,
        failCount: dashes.length,
        detail: [...new Set(dashes)],
        suggestion: "Replace an em dash with a comma and an en dash with a hyphen, or run pix_compress.",
      };
    },
  },
  {
    id: "fp-no-typographic-chars",
    label: "No curly quotes or ellipsis glyphs",
    description:
      "Curly quotes and the ellipsis character do not survive a copy-paste into source. Use straight quotes and three dots.",
    check: (code) => {
      const { typographic } = findFingerprints(code);

      return {
        pass: typographic.length === 0,
        failCount: typographic.length,
        detail: [...new Set(typographic)],
        suggestion: "Use straight quotes (\" and ') and ... instead, or run pix_compress.",
      };
    },
  },
];
