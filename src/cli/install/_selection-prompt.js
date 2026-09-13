/**
 * @module cli/install/selection-prompt
 *
 * Ask which commands to write.
 *
 * One screen for the common case - a preset, chosen with one keystroke - and
 * three only for someone who asks for them. A picker that always demanded
 * three screens would be a picker people learn to press Enter through, which
 * is the same as not asking.
 *
 * The prompts are injectable so the flow is testable without a terminal.
 */

import { FAMILIES, PRESETS, resolveSelection } from "./_selection.js";
import { skillAreas } from "../../prompts/_areas.js";

/** What a preset costs, so the label can say it before it is chosen. */
function presetOptions() {
  return [
    ...Object.entries(PRESETS).map(([id, preset]) => ({
      value: id,
      label: `${preset.label} (${resolveSelection({ preset: id }).commands.length})`,
      hint: preset.hint,
    })),
    { value: "custom", label: "Custom", hint: "choose families, then areas, then skills" },
  ];
}

/**
 * The commands to write, as chosen.
 *
 * @param {object} [io]
 * @param {(options: object) => Promise<any>} [io.select] - single choice
 * @param {(options: object) => Promise<any>} [io.multiselect] - many choices
 * @returns {Promise<{ commands: string[], preset: string|null }>}
 */
export async function promptSelection(io = {}) {
  const { select, multiselect } = io.select && io.multiselect ? io : await clackPrompts();

  const preset = await select({ message: "What should be installed?", options: presetOptions(), initialValue: "standard" });

  if (preset !== "custom") {
    return { commands: resolveSelection({ preset }).commands, preset };
  }

  const families = await multiselect({
    message: "Which families?",
    options: FAMILIES.map((family) => ({ value: family.id, label: family.label, hint: family.hint })),
    initialValues: ["areas", "tasks"],
    required: false,
  });

  if (!families.includes("areas")) {
    return { commands: resolveSelection({ families }).commands, preset: null };
  }

  const all = skillAreas();
  const areas = await multiselect({
    message: "Which areas?",
    options: [...all.entries()].map(([area, entry]) => ({ value: area, label: area, hint: `${entry.members.length} skills` })),
    initialValues: [...all.keys()],
    required: false,
  });

  const members = areas.flatMap((area) => all.get(area)?.members ?? []);

  if (members.length === 0) {
    return { commands: resolveSelection({ families, areas }).commands, preset: null };
  }

  const skills = await multiselect({
    message: "Which skills? (the area hubs are always kept)",
    options: members.map((skill) => ({ value: skill, label: skill })),
    initialValues: members,
    required: false,
  });

  return { commands: resolveSelection({ families, areas, skills }).commands, preset: null };
}

/** The real prompts, imported only when no injected pair was given. */
async function clackPrompts() {
  const { multiselect, select } = await import("@clack/prompts");

  return { select, multiselect };
}
