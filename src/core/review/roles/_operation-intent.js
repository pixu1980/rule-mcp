/**
 * @module core/review/roles/operation-intent
 *
 * How deep a persona run goes, decided from the request the user typed after
 * `/rule-persona-<role>`. The command was split three ways per role (57 commands
 * for 19 roles); folding it back into one command moves the choice into the
 * argument, the same move ADR 116 made for the check siblings.
 *
 * The ladder is cumulative, because each document is derived from the previous
 * one: an audit always runs, a review adds `docs/reviews/`, a plan adds
 * `docs/plans/`. A request that names no stage gets the cheapest useful run
 * (audit); a request that asks for both a review and a plan gets the deepest.
 *
 * Whole-token matching, case- and accent-insensitive, English and Italian.
 * Kept in one module so the command body, the prompt resolver and the tests
 * cannot drift.
 */

/** Keywords that raise a run to audit plus review. */
export const REVIEW_INTENT_KEYWORDS = Object.freeze([
  "review",
  "reviews",
  "reviewing",
  "reviewed",
  "findings",
  "finding",
  "issues",
  "issue",
  "problems",
  "problem",
  "risks",
  "risk",
  "assessment",
  "assess",
  "analyze",
  "analyzes",
  "analyzing",
  "analysis",
  "evaluate",
  "evaluates",
  "evaluating",
  "evaluation",
  "analizza",
  "analizzare",
  "analisi",
  "esamina",
  "esaminare",
  "esame",
  "valuta",
  "valutare",
  "valutazione",
  "problemi",
  "problema",
  "criticita",
  "revisione",
  "revisiona",
  "revisionare",
]);

/** Keywords that raise a run to the deepest ladder: audit, review and plan. */
export const PLAN_INTENT_KEYWORDS = Object.freeze([
  "plan",
  "plans",
  "planning",
  "planned",
  "roadmap",
  "roadmaps",
  "steps",
  "step",
  "remediation",
  "piano",
  "piani",
  "pianifica",
  "pianificare",
  "pianificazione",
  "passi",
  "passo",
  "azioni",
  "azione",
]);

/** Both sets, keyed by the operation they raise the run to. */
export const OPERATION_INTENT_KEYWORDS = Object.freeze({
  review: REVIEW_INTENT_KEYWORDS,
  plan: PLAN_INTENT_KEYWORDS,
});

/** Comma-separated review keywords for embedding in command bodies. */
export const REVIEW_INTENT_KEYWORDS_LIST = REVIEW_INTENT_KEYWORDS.join(", ");

/** Comma-separated plan keywords for embedding in command bodies. */
export const PLAN_INTENT_KEYWORDS_LIST = PLAN_INTENT_KEYWORDS.join(", ");

const TOKEN = /[a-z0-9]+(?:'[a-z]+)?/g;

/** Accents out, lowercase: "criticita" matches "criticità", "analyze" matches "Analyze". */
const normalize = (text) =>
  text
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Whole-token membership, so "plane" never matches "plan" and "checkbox" never matches "check". */
function hasKeyword(text, wanted) {
  for (const match of text.matchAll(TOKEN)) {
    if (wanted.has(match[0])) {
      return true;
    }
  }

  return false;
}

/**
 * The operation a `/rule-persona-<role>` request asks for.
 *
 * Plan wins over review when a request names both: the deepest explicit ask is
 * the one that also produces the documents below it.
 *
 * @param {string|null|undefined} request - the text typed after the command
 * @returns {"audit"|"review"|"plan"}
 */
export function operationForPrompt(request) {
  if (typeof request !== "string" || request.trim() === "") {
    return "audit";
  }

  const text = normalize(request);

  if (hasKeyword(text, new Set(PLAN_INTENT_KEYWORDS))) {
    return "plan";
  }

  if (hasKeyword(text, new Set(REVIEW_INTENT_KEYWORDS))) {
    return "review";
  }

  return "audit";
}
