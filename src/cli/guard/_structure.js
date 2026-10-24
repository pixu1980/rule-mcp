/**
 * @module cli/guard/_structure
 *
 * The one confirmation a task can be asked for: this change is structural.
 *
 * Everything else the file hooks do reports (ADR 129). This gate is the
 * exception, and it is scoped to be one: it asks per task, not per file, and it
 * goes quiet for the rest of the task once the answer is in. A second file of
 * the same architectural change is the same decision, already taken.
 *
 * The model's own declaration is the normal road - it is the one that knows
 * whether a change is architectural. The two signals below are the net under
 * it, for the task that never declared itself. Creating a file is not one of
 * them (ADR 129): a new module is ordinary work, and asking about it asked
 * about every test file a task wrote first.
 *
 * @see module:cli/guard/_task - where the answer is remembered
 */

import { ALLOW, ask } from "./_verdict.js";
import { confirmIfAsked, markAsked, readTask } from "./_task.js";
import { writtenText } from "./_written.js";

/** An ADR is a decision by definition, wherever the project keeps them. */
const DECISION_RECORD = /(^|\/)docs\/adr\//i;

/** A package.json at any depth. */
const MANIFEST_FILE = /(?:^|\/)package\.json$/;

/** The dependency blocks of a manifest: what a project runs on. */
const DEPENDENCY_BLOCK = /"(?:dependencies|devDependencies|peerDependencies|optionalDependencies)"\s*:/;

/**
 * Why this write is structural, in one line, or nothing when it is ordinary
 * work. The declaration wins where there is one: the model said what it is
 * doing, and no signal describes it better.
 *
 * @param {object} input - the hook's `tool_input`
 * @param {string} [declared] - what the model declared about this task
 * @returns {string}
 */
export function structuralSignal(input = {}, declared = "") {
  if (declared) {
    return declared;
  }

  const path = String(input.file_path ?? "");

  if (DECISION_RECORD.test(path)) {
    return "it records an architecture decision";
  }

  if (MANIFEST_FILE.test(path) && writtenText(input).some((text) => DEPENDENCY_BLOCK.test(text))) {
    return "it changes what the project depends on";
  }

  return "";
}

/** What the confirmation asks, and what it promises about the rest of the task. */
function reason(why) {
  return [
    `This change is structural: ${why}.`,
    "",
    "Confirm it once and the rest of this task proceeds without being asked again - every following file of the same change, and every ordinary edit beside it.",
    "The next prompt starts a new task and a new question.",
  ].join("\n");
}

/**
 * Whether this write needs the task's one confirmation.
 *
 * A task that has confirmed is done being asked. A task that was asked and not
 * confirmed is asked again: the write that would have answered it never landed.
 *
 * @param {object} input - the hook's `tool_input`
 * @param {string} [cwd] - the project the task belongs to
 * @returns {object} hook output
 */
export function decideStructure(input = {}, cwd = process.cwd()) {
  const task = readTask(cwd);

  if (task.confirmed) {
    return ALLOW;
  }

  const why = structuralSignal(input, task.declared);

  if (!why) {
    return ALLOW;
  }

  markAsked(cwd);

  return ask(reason(why));
}

/**
 * The answer to the question, read off the write that followed it.
 *
 * @param {string} [cwd]
 */
export function noteWriteLanded(cwd = process.cwd()) {
  confirmIfAsked(cwd);
}
