/** @module cli/install/selection-flags - the selection a set of flags asks for */

import { resolveSelection } from "./_selection.js";

/** A comma-separated flag as a list, or undefined when it was not given. */
const list = (value) =>
  typeof value === "string"
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : undefined;

/**
 * The commands the flags select, or null when they select nothing in
 * particular - which every caller reads as "all of them", the behavior that
 * held before the surface grew a command per skill.
 *
 * Problems are printed rather than thrown: a typo in one area name must not
 * stop the install writing the areas that were spelled right.
 *
 * @param {{ preset?: string, families?: string, areas?: string, skills?: string }} options
 * @param {(text: string) => void} [warn]
 * @returns {string[]|null}
 */
export function selectionFrom(options, warn = (text) => process.stderr.write(`${text}\n`)) {
  const families = list(options.families);
  const areas = list(options.areas);
  const skills = list(options.skills);

  if (!options.preset && !families && !areas && !skills) {
    // No flag asked for anything, which every caller reads as "all of them".
    return null;
  }

  const { commands, problems } = resolveSelection({
    preset: options.preset,
    families: families ?? (options.preset ? [] : ["areas", "personas", "tasks"]),
    areas,
    skills,
  });

  for (const problem of problems) {
    warn(`agent-commands: ${problem}`);
  }

  return commands;
}
