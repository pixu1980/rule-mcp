

/**
 * @module cli/install/selection
 *
 * Which commands an install writes.
 *
 * Every skill owns a command, so writing all of them is 152 files in every
 * agent directory. That is the right default for nobody: this turns the choice
 * into data - a preset, or families plus areas plus skills - so the
 * interactive picker and the flags decide the same thing the same way, and a
 * test can assert what each choice produces.
 *
 * The router is always written. It is the dispatcher every other command
 * routes through, and an install without it is an install that does nothing.
 */

import { commandNames, ROUTER_COMMAND } from "../../core/agents/commands/index.js";
import { areaOf, skillAreas } from "../../prompts/_areas.js";

/** The families a command belongs to, in the order a picker shows them. */
export const FAMILIES = [
  { id: "areas", label: "Areas and skills", hint: "one command per skill, grouped by area" },
  { id: "personas", label: "Review personas", hint: "audit, review and plan as a specialist" },
  { id: "tasks", label: "One-shot tasks", hint: "handoff, handon, init, flight, update, check" },
];

/** The family a command name belongs to. */
function familyOf(name) {
  if (name === ROUTER_COMMAND) {
    return "router";
  }

  if (name.startsWith("rule-area-")) {
    return "areas";
  }

  return name.startsWith("rule-persona-") ? "personas" : "tasks";
}

/**
 * The presets, in the order a picker offers them.
 *
 * `minimal` takes the area hubs without their members: eleven commands that
 * can reach every skill through the router, for someone who wants the surface
 * small. `standard` adds the personas and the tasks but still no per-skill
 * command. `full` is everything.
 */
export const PRESETS = {
  minimal: { families: ["areas"], hubsOnly: true, label: "Minimal", hint: "the router and the area hubs" },
  standard: { families: ["areas", "personas", "tasks"], hubsOnly: true, label: "Standard", hint: "areas, personas and tasks, without a command per skill" },
  full: { families: ["areas", "personas", "tasks"], hubsOnly: false, label: "Full", hint: "every command, including one per skill" },
};

/** The hub command name of every area. */
function hubNames() {
  return new Set([...skillAreas().keys()].map((area) => `rule-area-${area}`));
}

/** The area a `rule-area-*` command belongs to. */
function areaOfCommand(name) {
  return areaOf(`rule-${name.slice("rule-area-".length)}`)?.area;
}

/**
 * The commands a selection resolves to.
 *
 * @param {object} selection
 * @param {string} [selection.preset] - minimal, standard or full
 * @param {string[]} [selection.families] - ignored when a preset is given
 * @param {string[]} [selection.areas] - narrows the areas family; all of them when absent
 * @param {string[]} [selection.skills] - narrows further, by skill name
 * @returns {{ commands: string[], problems: string[] }}
 */
export function resolveSelection(selection = {}) {
  const problems = [];
  const preset = selection.preset ? PRESETS[selection.preset] : null;

  if (selection.preset && !preset) {
    problems.push(`unknown preset "${selection.preset}"`);
  }

  const known = new Set(FAMILIES.map((family) => family.id));
  const asked = preset ? preset.families : (selection.families ?? []);

  for (const family of asked) {
    if (!known.has(family)) {
      problems.push(`unknown family "${family}"`);
    }
  }

  const families = new Set(asked.filter((family) => known.has(family)));
  const areas = selection.areas?.length ? new Set(selection.areas) : null;
  const skills = selection.skills?.length ? new Set(selection.skills) : null;
  const allAreas = skillAreas();

  for (const area of areas ?? []) {
    if (!allAreas.has(area)) {
      problems.push(`unknown area "${area}"`);
    }
  }

  const allSkills = new Set([...allAreas.values()].flatMap((entry) => [entry.hub, ...entry.members].filter(Boolean)));

  for (const skill of skills ?? []) {
    if (!allSkills.has(skill)) {
      problems.push(`unknown skill "${skill}"`);
    }
  }

  const hubs = hubNames();
  const commands = commandNames().filter((name) => {
    if (name === ROUTER_COMMAND) {
      return true;
    }

    const family = familyOf(name);

    if (!families.has(family)) {
      return false;
    }

    if (family !== "areas") {
      return true;
    }

    const area = areaOfCommand(name);

    if (areas && !areas.has(area)) {
      return false;
    }
    // A hub keeps its area reachable, so it survives a per-skill narrowing.
    if (hubs.has(name)) {
      return true;
    }

    if (preset?.hubsOnly ?? selection.hubsOnly) {
      return false;
    }

    return !skills || skills.has(`rule-${name.slice("rule-area-".length)}`);
  });

  return { commands, problems };
}
