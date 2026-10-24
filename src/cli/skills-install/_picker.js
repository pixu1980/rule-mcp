/** @module cli/skills-install/picker - the interactive multi-select */

import { multiselect, isCancel } from "@clack/prompts";

/**
 * Interactive multiselect over the skill catalog, backed by @clack/prompts.
 *
 * Returns the selected skill indices (ordered), or the clack cancel symbol.
 * `prompt` is injectable so tests can drive the selection without a TTY; the
 * default is @clack/prompts `multiselect` (battle-tested raw-mode handling on
 * macOS/Linux/Windows and Escape-to-cancel for free).
 */
export async function promptSkillSelection(items, { message, initialValues = [], prompt } = {}) {
  const run = prompt ?? ((options) => multiselect(options));

  return run({
    message,
    options: items.map((skill, index) => ({
      value: index,
      label: skill.displayName || skill.name,
      hint: skill.description,
    })),
    initialValues,
    required: false,
  });
}

/**
 * True when a prompt result means "user aborted".
 *
 * @clack/prompts returns its own cancel symbol; `undefined` also aborts so an
 * injected prompt (tests) and a failed raw-mode setup follow the same path.
 */
export const isCancelSelection = (value) => value === undefined || isCancel(value);
