// Auto-split from src/core/guardrails/quality.js - see ./quality/index.js

import { INSTALLED_GROUPS, isPinned, manifestOf } from "./guards-meta.js";
import { findFingerprints } from "../../fingerprint.js";
import { scanCodeForForeign, scanDocumentForForeign } from "../../en-english.js";
import { findRaggedBoxes } from "../../ascii-box.js";








export const QUALITY_GUARDRAILS_PART2 = [
  {
    id: "fp-american-english",
    label: "American English spelling",
    description: "The house style is American English: -or over -our, -ize over -ise, -er over -re, -og over -ogue.",
    check: (code) => {
      const { british } = findFingerprints(code);

      return {
        pass: british.length === 0,
        failCount: british.length,
        detail: british.slice(0, 10),
        suggestion:
          "Use the American spelling. Identifiers from third-party APIs are exempt - put them in a code span or leave them in code.",
      };
    },
  },
  {
    id: "en-english-only-prose",
    label: "English-only prose",
    description:
      "Every generated comment, identifier and document is English. A non-ASCII letter in a comment, two distinct foreign function words in a comment, a foreign function word in an identifier, or non-ASCII/foreign prose in a .md document fail this rule (see rule-styleguide-english).",
    check: (code, context = {}) => {
      const fileName = String(context.fileName ?? "").toLowerCase();
      const docs = /\.(?:md|mdx|txt)$/.test(fileName);
      const hits = docs ? scanDocumentForForeign(code) : scanCodeForForeign(code);

      if (hits.length === 0) {
        return { pass: true };
      }

      return {
        pass: false,
        failCount: hits.length,
        detail: hits.slice(0, 10),
        suggestion:
          "Write comments, identifiers and documents in English, American spelling (color, behavior, organize). " +
          "Companion rule fp-american-english catches the British spellings; if a user-facing string must stay " +
          "in another language (i18n data), keep it in a data file, not in a comment or identifier.",
      };
    },
  },
  {
    id: "fp-box-rectangular",
    label: "A drawn box is a rectangle",
    description:
      "Every line of a box ends in the same column. A right edge that steps in and out is the one tell a spell-check cannot see.",
    check: (code) => {
      const ragged = findRaggedBoxes(code);

      return {
        pass: ragged.length === 0,
        failCount: ragged.length,
        detail: ragged
          .slice(0, 10)
          .map((entry) =>
            entry.reason === "box never closes"
              ? `line ${entry.line}: box never closes`
              : `line ${entry.line}: ${entry.width} columns, expected ${entry.expected}`,
          ),
        suggestion: "Pad the short lines out to the widest line of the same box, or run pix_compress.",
      };
    },
  },
  {
    id: "pkg-exact-versions",
    label: "Dependencies are pinned exactly",
    description:
      "Every dependency, devDependency and optionalDependency is an exact version: no ^, ~, comparator, alternation, wildcard, x-range or dist-tag. A range leaves the subdependency tree free to change between two installs of the same commit. peerDependencies are exempt: a peer range states compatibility, it does not install anything.",
    check: (code, context) => {
      const manifest = manifestOf(code, context);

      if (!manifest) {
        return { pass: true, note: "Not a package.json, skipping" };
      }

      const ranged = [];

      for (const group of INSTALLED_GROUPS) {
        const entries = manifest[group];

        if (!entries || typeof entries !== "object") {
          continue;
        }

        for (const [name, spec] of Object.entries(entries)) {
          if (typeof spec !== "string" || isPinned(spec)) {
            continue;
          }

          ranged.push(`${group}.${name}: "${spec}"`);
        }
      }

      return {
        pass: ranged.length === 0,
        failCount: ranged.length,
        detail: ranged.slice(0, 10),
        suggestion:
          "Pin each one to the version currently installed (`pnpm add --save-exact <pkg>`), and put `save-exact=true` in .npmrc so the next install does not reintroduce the range.",
      };
    },
  },
];
