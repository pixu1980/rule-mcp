/** The rules rule-process-ai owns, in canonical order. */
import { fpAmericanEnglish } from "./_american-english.js";
import { fpBoxRectangular } from "./_box-rectangular.js";
import { enEnglishOnlyFilenames } from "./_english-only-filenames.js";
import { enEnglishOnlyProse } from "./_english-only-prose.js";
import { fpNoEmdash } from "./_no-emdash.js";
import { noPlaceholderImplementation } from "./_no-placeholder-implementation.js";
import { noSpeculativeAuditTable } from "./_no-speculative-audit-table.js";
import { noSuppressedErrors } from "./_no-suppressed-errors.js";
import { fpNoTypographicChars } from "./_no-typographic-chars.js";

export const GUARDRAILS = [
  enEnglishOnlyFilenames,
  enEnglishOnlyProse,
  fpAmericanEnglish,
  fpNoEmdash,
  fpNoTypographicChars,
  fpBoxRectangular,
  noPlaceholderImplementation,
  noSpeculativeAuditTable,
  noSuppressedErrors,
];
