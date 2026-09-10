

import { scanCodeForForeign, scanDocumentForForeign } from "../../../text/en-english/index.js";

/** Guardrail `en-english-only-prose`: English-only prose */
export const enEnglishOnlyProse = {
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
};
