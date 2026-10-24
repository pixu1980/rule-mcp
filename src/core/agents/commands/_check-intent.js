/**
 * @module core/agents/commands/check-intent
 *
 * Whole-token keywords that flip an area or router slash command into the
 * guardrail-only path (ADR 116). Kept in one list so bodies, tests and the ADR
 * cannot drift.
 */

/** Canonical check-intent tokens (English + Italian), lowercase. */
export const CHECK_INTENT_KEYWORDS = Object.freeze([
  "check",
  "checks",
  "checking",
  "controlla",
  "controllare",
  "controllo",
  "controlli",
  "validate",
  "validates",
  "validating",
  "validation",
  "valida",
  "validare",
  "validazione",
  "verify",
  "verifies",
  "verifying",
  "verification",
  "verifica",
  "verificare",
  "guardrail",
  "guardrails",
  "lint",
  "linting",
]);

/** Comma-separated list for embedding in command bodies. */
export const CHECK_INTENT_KEYWORDS_LIST = CHECK_INTENT_KEYWORDS.join(", ");

const TOKEN = /[a-z0-9]+(?:'[a-z]+)?/gi;

/**
 * True when `text` contains any check-intent keyword as a whole token.
 *
 * @param {string|null|undefined} text
 * @returns {boolean}
 */
export function hasCheckIntent(text) {
  if (typeof text !== "string" || text.length === 0) {
    return false;
  }

  const wanted = new Set(CHECK_INTENT_KEYWORDS);

  for (const match of text.toLowerCase().matchAll(TOKEN)) {
    if (wanted.has(match[0])) {
      return true;
    }
  }

  return false;
}
