/**
 * Handoff sections that quote TokenSave instead of re-deriving their content.
 *
 * Two things only the graph knows: the decisions earlier sessions recorded, and
 * the tests the changed files reach. Both sections are silent when the graph is
 * absent, which is the whole fallback: a handoff without TokenSave reads exactly
 * as it did before these lines existed.
 */

/** Longest decision reason the handoff copies, in characters. */
const REASON_LIMIT = 160;

/** How many entries each format carries. */
const FORMAT_LIMITS = { brief: 3, full: 8 };

/** One line: the decision, then the reason when it fits. */
function decisionLine(decision) {
  const text = String(decision?.text ?? "").trim();

  if (text === "") {
    return null;
  }

  const reason = String(decision?.reason ?? "").trim();

  if (reason === "") {
    return `- ${text}`;
  }

  return `- ${text} - ${reason.length > REASON_LIMIT ? `${reason.slice(0, REASON_LIMIT)}...` : reason}`;
}

/**
 * Decisions recorded in TokenSave, newest first as the tool returns them.
 *
 * `docs/adr/` stays the source of truth; this is the index beside it, and it is
 * only worth quoting when it has entries.
 *
 * @param {{ decisions?: Array<{ text?: string, reason?: string }> }|null} recalled
 * @param {{ isMinimal: boolean, isBrief: boolean }} shape
 * @returns {string[]}
 */
export function recallLines(recalled, { isMinimal, isBrief }) {
  if (isMinimal || !recalled) {
    return [];
  }

  const lines = (recalled.decisions ?? []).map(decisionLine).filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  return ["### Decisions on record (TokenSave)", "", ...lines.slice(0, isBrief ? FORMAT_LIMITS.brief : FORMAT_LIMITS.full), ""];
}

/**
 * The tests the changed files reach, so the next session knows what to run.
 *
 * @param {{ tests?: string[] }|null} affected
 * @param {{ isMinimal: boolean, isBrief: boolean }} shape
 * @returns {string[]}
 */
export function affectedTestLines(affected, { isMinimal, isBrief }) {
  const tests = affected?.tests ?? [];

  if (isMinimal || tests.length === 0) {
    return [];
  }

  const shown = isBrief ? tests.slice(0, FORMAT_LIMITS.brief * 2) : tests.slice(0, FORMAT_LIMITS.full * 2);
  const lines = ["### Tests Reached by These Changes (TokenSave)", ""];

  for (const test of shown) {
    lines.push(`- \`${test}\``);
  }

  if (tests.length > shown.length) {
    lines.push(`- ... and ${tests.length - shown.length} more`);
  }

  lines.push("");

  return lines;
}
