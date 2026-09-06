/** Prose and typography guardrails (fingerprint + English-only), one rule per file. */
import { fpNoEmdash } from "./_no-emdash.js";
import { fpNoTypographicChars } from "./_no-typographic-chars.js";
import { fpAmericanEnglish } from "./_american-english.js";
import { enEnglishOnlyProse } from "./_english-only-prose.js";
import { enEnglishOnlyFilenames } from "./_english-only-filenames.js";
import { fpBoxRectangular } from "./_box-rectangular.js";

export const PROSE_GUARDRAILS = [
  fpNoEmdash,
  fpNoTypographicChars,
  fpAmericanEnglish,
  enEnglishOnlyProse,
  enEnglishOnlyFilenames,
  fpBoxRectangular,
];
