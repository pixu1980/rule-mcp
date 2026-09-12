/** The rules rule-styleguide-fingerprint owns, in canonical order. */
import { fpAmericanEnglish } from "./_american-english.js";
import { fpBoxRectangular } from "./_box-rectangular.js";
import { fpNoEmdash } from "./_no-emdash.js";
import { fpNoTypographicChars } from "./_no-typographic-chars.js";

export const GUARDRAILS = [fpAmericanEnglish, fpBoxRectangular, fpNoEmdash, fpNoTypographicChars];
