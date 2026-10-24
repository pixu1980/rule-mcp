/**
 * @module cli/setup/commands-items
 *
 * The rows the commands step shows, and the sentence a selection becomes.
 *
 * Pure, and separate from the step that draws it, for the reason the rest of
 * this folder is split that way: the flow can be tested without a terminal.
 * The data itself lives in `src/cli/install/_selection.js` - this only turns
 * it into rows, with the count of what each choice writes, because a preset
 * whose price is invisible is a preset chosen blind.
 */

import { FAMILIES, PRESETS, resolveSelection } from "../install/_selection.js";
import { skillAreas } from "../../prompts/_areas.js";

/** How many commands a selection resolves to. */
const count = (selection) => resolveSelection(selection).commands.length;

/**
 * The presets, plus the way out of the one-screen case.
 *
 * @returns {Array<{ id: string, label: string, detail: string[] }>}
 */
export function presetItems() {
  return [
    ...Object.entries(PRESETS).map(([id, preset]) => ({
      id,
      label: `${preset.label} (${count({ preset: id })})`,
      detail: [preset.hint, "", `Writes ${count({ preset: id })} command files per agent directory.`],
    })),
    {
      id: "custom",
      label: "Custom",
      detail: ["Choose families, then areas, then skills.", "", "Three more screens, and only for whoever asks."],
    },
  ];
}

/**
 * The families a command can belong to.
 *
 * @returns {Array<{ id: string, label: string, detail: string[] }>}
 */
export function familyItems() {
  return FAMILIES.map((family) => ({
    id: family.id,
    label: family.label,
    detail: [family.hint, "", `${count({ families: [family.id] })} commands, with the router.`],
  }));
}

/**
 * Every area in the resolved catalog.
 *
 * @returns {Array<{ id: string, label: string, note: string, detail: string[] }>}
 */
export function areaItems() {
  return [...skillAreas().entries()].map(([area, entry]) => ({
    id: area,
    label: area,
    note: `${entry.members.length}`,
    detail: [
      `The ${area} hub and its ${entry.members.length} skills.`,
      "",
      ...entry.members.slice(0, 8),
      entry.members.length > 8 ? `and ${entry.members.length - 8} more` : "",
    ].filter(Boolean),
  }));
}

/**
 * The skills of the chosen areas, grouped by area.
 *
 * The hubs are left out: they are kept whatever this screen says, so offering
 * a tick that changes nothing would be the third kind of lie.
 *
 * @param {string[]} [areas] - every area when absent
 * @returns {Array<{ id: string, label: string, section?: boolean, detail?: string[] }>}
 */
export function skillItems(areas) {
  const all = skillAreas();
  const chosen = areas?.length ? areas.filter((area) => all.has(area)) : [...all.keys()];

  return chosen.flatMap((area) => [
    { id: `section:${area}`, label: area, section: true },
    ...(all.get(area)?.members ?? []).map((skill) => ({
      id: skill,
      label: skill,
      detail: [`Writes /${skill.replace(/^rule-mcp-/, "rule-area-")}.`, "", `Area: ${area}.`],
    })),
  ]);
}

/**
 * What a selection writes, in one line, for the review screen and the plan.
 *
 * @param {{ preset?: string, families?: string[], areas?: string[], skills?: string[] }|null} [selection]
 * @returns {string}
 */
export function selectionLabel(selection) {
  if (!selection) {
    return "every command";
  }

  if (selection.preset) {
    return `preset ${selection.preset} (${count({ preset: selection.preset })})`;
  }

  const parts = [
    selection.families?.length ? selection.families.join("+") : "",
    selection.areas?.length ? selection.areas.join(",") : "",
    selection.skills?.length ? `${selection.skills.length} skills` : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" - ") : "every command";
}
