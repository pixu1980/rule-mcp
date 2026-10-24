/**
 * @module cli/guard/_write
 *
 * What a file that just landed has to say for itself: the language it is
 * written in, and the guardrails of the skill that owns it.
 *
 * It reports to the model and it decides nothing (ADR 129). A file gate that
 * stopped to ask would put a person in the loop of a find-and-replace, once per
 * file, in every project on the machine.
 */

import { findFingerprints, fingerprintEnabled, stripFingerprint } from "../../core/text/fingerprint/index.js";

import { writeGuardrailReport } from "./_write-check.js";
import { writtenText } from "./_written.js";

export { writtenText } from "./_written.js";

/** House style: American English, ASCII punctuation. */
const ENGLISH_ONLY = "Prose and comments: American English, ASCII punctuation (no em dashes, curly quotes).";

/**
 * What the language rule has to say about the text that just landed.
 *
 * @param {object} input - the hook's `tool_input`
 * @returns {string} the report, or an empty string when there is nothing to say
 */
function languageReport(input) {
  if (!fingerprintEnabled()) {
    return "";
  }

  const path = String(input.file_path ?? "");
  const problems = [];

  for (const text of writtenText(input)) {
    const { british, dashes, typographic } = findFingerprints(text);

    for (const word of british.slice(0, 10)) {
      problems.push(`- "${word}" is British: write "${stripFingerprint(word)}"`);
    }

    if (dashes.length > 0) {
      problems.push(`- ${dashes.length} em/en dash(es): use a hyphen or a comma`);
    }

    if (typographic.length > 0) {
      problems.push(`- ${typographic.length} curly quote(s) or ellipsis: use ASCII`);
    }
  }

  if (problems.length === 0) {
    return "";
  }

  return [`${ENGLISH_ONLY}`, "", `What just landed does not${path ? ` (${path})` : ""}. Fix these:`, ...[...new Set(problems)].slice(0, 20)].join("\n");
}

/** Locale and message files are non-English by design, so the gate skips them. */
export const LOCALE_FILE = /(^|\/)(locales?|i18n|lang|translations?|messages)(\/|$)|\.(po|pot|xliff|xlf)$/i;

/**
 * Everything the file that just landed has to answer for.
 *
 * @param {object} input - the hook's `tool_input`
 * @returns {Promise<{ advice: string, guardrailFailures?: number, guardrailRules?: Record<string, number> }>}
 */
export async function adviseWrite(input = {}) {
  if (LOCALE_FILE.test(String(input.file_path ?? ""))) {
    return { advice: "" };
  }

  const language = languageReport(input);
  const { report, guardrailFailures, guardrailRules } = await writeGuardrailReport(input);

  return {
    advice: [language, report].filter(Boolean).join("\n\n"),
    guardrailFailures,
    guardrailRules,
  };
}
