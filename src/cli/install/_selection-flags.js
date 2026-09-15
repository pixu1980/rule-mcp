

/** @module cli/install/selection-flags - the selection a set of flags asks for */

import { resolveSelection } from "./_selection.js";

/** A comma-separated flag as a list, or undefined when it was not given. */
const list = (value) =>
  typeof value === "string"
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : Array.isArray(value) && value.length > 0
      ? value
      : undefined;

/**
 * The selection a set of flags describes, or null when they describe none.
 *
 * Null is not "nothing": every caller reads it as "all of them", the behavior
 * that held before the surface grew a command per skill.
 *
 * @param {{ preset?: string, families?: string|string[], areas?: string|string[], skills?: string|string[] }} options
 * @returns {{ preset?: string, families?: string[], areas?: string[], skills?: string[] }|null}
 */
export function selectionOf(options = {}) {
  const families = list(options.families);
  const areas = list(options.areas);
  const skills = list(options.skills);

  if (!options.preset && !families && !areas && !skills) {
    return null;
  }

  return { preset: options.preset, families, areas, skills };
}

/**
 * The argv a selection asks for, for the `agent-commands` run that writes it.
 *
 * The inverse of `selectionOf`, so the wizard's answer and a flagged install
 * reach the same command line rather than two that drifted.
 *
 * @param {{ preset?: string, families?: string[], areas?: string[], skills?: string[] }|null} [selection]
 * @returns {string[]}
 */
export function selectionArgs(selection) {
  if (!selection) {
    return [];
  }

  if (selection.preset) {
    return ["--preset", selection.preset];
  }

  return [
    ...(selection.families?.length ? ["--families", selection.families.join(",")] : []),
    ...(selection.areas?.length ? ["--areas", selection.areas.join(",")] : []),
    ...(selection.skills?.length ? ["--skills", selection.skills.join(",")] : []),
  ];
}

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
  const selection = selectionOf(options);

  if (!selection) {
    return null;
  }

  const { commands, problems } = resolveSelection({
    preset: selection.preset,
    families: selection.families ?? (selection.preset ? [] : ["areas", "personas", "tasks"]),
    areas: selection.areas,
    skills: selection.skills,
  });

  for (const problem of problems) {
    warn(`agent-commands: ${problem}`);
  }

  return commands;
}
