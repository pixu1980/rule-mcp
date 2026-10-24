/** The English gate: every ADR is written in English, filename included. */
import { scanDocumentForForeign, scanPathForForeign } from "../../core/text/index.js";

/**
 * Non-English content in the ADR fields, one offense per finding.
 *
 * The title feeds the file name (ADR 057 landed with an Italian slug), so it
 * runs through the path scanner word by word; the prose fields run through
 * both the document scanner (function words, accents) and the path scanner
 * (name-plausible content words).
 *
 * @param {{ title?: string, context?: string, decision?: string, consequences?: string, alternatives?: string[] }} fields
 * @returns {string[]} human-readable offenses, empty when everything is English
 */
export function adrEnglishOffenses(fields) {
  const offenses = [];
  const prose = [
    ["title", fields.title ?? ""],
    ["context", fields.context ?? ""],
    ["decision", fields.decision ?? ""],
    ["consequences", fields.consequences ?? ""],
    ["alternatives", (fields.alternatives ?? []).join("\n")],
  ];

  for (const [field, text] of prose) {
    if (text === "") {
      continue;
    }

    for (const finding of [...scanDocumentForForeign(text), ...scanPathForForeign(text.replaceAll(/[\\/]+/g, " "))]) {
      offenses.push(`${field}: ${finding}`);
    }
  }

  return offenses;
}
