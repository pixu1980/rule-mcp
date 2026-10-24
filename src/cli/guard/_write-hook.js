/**
 * @module cli/guard/_write-hook
 *
 * The PostToolUse branch: what the file that just landed is reported as, and
 * the proof that the question before it was answered.
 *
 * @see module:cli/guard/_write - the report itself
 * @see module:cli/guard/_structure - the question this answers
 */

import { noteWriteLanded } from "./_structure.js";
import { ALLOW, SILENT, advise, neverBlocks } from "./_verdict.js";

/**
 * Answer the file hook and record the row behind it.
 *
 * @param {object} payload - the hook payload, already parsed
 * @param {(text: string) => void} write - how the answer reaches the host
 */
export async function runWriteHook(payload, write) {
  let report;

  try {
    const { adviseWrite } = await import("./_write.js");

    report = await adviseWrite(payload?.tool_input ?? {});
  } catch {
    report = { advice: "" };
  }

  // The file landed, so the question the structural gate asked before it was
  // answered yes: the harness only runs a tool call the person allowed.
  noteWriteLanded(payload?.cwd);

  // A settings file written before ADR 129 still calls this from PreToolUse.
  // There it can only wave the write through: the answer is the one shape that
  // decides nothing, and `neverBlocks` makes that true by construction.
  const answer = payload?.hook_event_name === "PreToolUse" ? ALLOW : report.advice ? advise(report.advice) : SILENT;

  write(JSON.stringify(neverBlocks(answer)));
}
