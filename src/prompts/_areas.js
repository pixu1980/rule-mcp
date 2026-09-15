

/**
 * @module prompts/areas
 *
 * One prompt per skill, grouped into areas read from the skill names.
 *
 * The area is already in the name: `rule-frontend-react` is frontend, and
 * `rule-frontend` is frontend itself. Deriving the grouping means a skill that
 * joins any layer - this repository, a project, a user's own - joins its area
 * without a second place remembering it.
 *
 * The hub skill owns its area's command rather than competing with a prompt of
 * the same name: `/rule-area-frontend` IS `rule-frontend`. Its members nest
 * under it, so an agent's command list sorts them together.
 */

import { getSkillNames } from "../tools/router/index.js";

/** The router skill backs the dispatcher, not an area. */
const ROUTER = "rule";

/**
 * The area a skill belongs to, and what it is called inside it.
 *
 * @param {string} skillName
 * @returns {{ area: string, member: string }|null} null when the name is not a skill of ours
 */
export function areaOf(skillName) {
  if (typeof skillName !== "string" || !skillName.startsWith("rule-")) {
    return null;
  }

  const rest = skillName.slice("rule-".length);
  const area = rest.split("-", 1)[0];

  return area === "" ? null : { area, member: rest.slice(area.length + 1) };
}

/**
 * The command a skill owns.
 *
 * @param {string} skillName
 * @returns {string|null}
 */
export function areaCommandName(skillName) {
  const parsed = areaOf(skillName);

  if (!parsed) {
    return null;
  }

  return parsed.member === "" ? `rule-area-${parsed.area}` : `rule-area-${parsed.area}-${parsed.member}`;
}

/**
 * Every area the resolved catalog holds, with its hub and its members.
 *
 * @returns {Map<string, { hub: string|null, members: string[] }>}
 */
export function skillAreas() {
  const areas = new Map();

  for (const skillName of getSkillNames()) {
    const parsed = areaOf(skillName);

    if (!parsed || skillName === ROUTER) {
      continue;
    }

    const entry = areas.get(parsed.area) ?? { hub: null, members: [] };

    if (parsed.member === "") {
      entry.hub = skillName;
    } else {
      entry.members.push(skillName);
    }

    areas.set(parsed.area, entry);
  }

  return areas;
}

/** The lines every area prompt shares: route, load evidence, check, commit. */
function promptLines(area, subject, evidence) {
  return [
    subject,
    `Route this request through \`pix_tool\` first, then load ${evidence} as source of truth.`,
    "The request is free text: extract the target framework, platform, database or tool from it when present; never invent APIs, files, dependencies, commands, or requirements not present in the skill evidence.",
    "Baseline: involve TDD (write failing tests first) and a11y (WCAG 2.2 AA, axe-core where applicable). If the request has no test/a11y surface, ask the user what to cover before finishing.",
    "Validate generated code with `rule_tool_check` and iterate until all guardrails pass.",
    "Compression is implicit: if the user is working in compression mode, keep the response compressed.",
    `When the work is done, propose a conventional commit message with a mandatory scope, e.g. "feat(${area}): ...".`,
  ].join("\n");
}

/** A readable list of an area's skills, capped so a prompt stays a prompt. */
function skillList(members) {
  const shown = members.slice(0, 12);

  return members.length > shown.length ? `${shown.join(", ")}, and ${members.length - shown.length} more` : shown.join(", ");
}

/**
 * One prompt per skill: the hub speaks for its area, a member for itself.
 *
 * @returns {Array<{ name: string, description: string, text: string, skill: string, area: string, arguments: object[] }>}
 */
export function listAreaPrompts() {
  const prompts = [];

  for (const [area, entry] of skillAreas()) {
    if (entry.hub) {
      prompts.push({
        name: `rule-area-${area}`,
        skill: entry.hub,
        area,
        description: `${area} work, across every ${area} skill`,
        text: promptLines(
          area,
          `You are the ${area} area specialist for rule-mcp.`,
          entry.members.length > 0 ? `the \`${entry.hub}\` skill and whichever of these the request needs: ${skillList(entry.members)}` : `the \`${entry.hub}\` skill`,
        ),
        arguments: [{ name: "request", description: `A ${area} task, in free text`, required: true }],
      });
    }

    for (const skill of entry.members) {
      prompts.push({
        name: areaCommandName(skill),
        skill,
        area,
        description: `${area}: the ${skill.slice(`rule-${area}-`.length)} skill`,
        text: promptLines(area, `You are working with the \`${skill}\` skill.`, `the \`${skill}\` skill`),
        arguments: [{ name: "request", description: `A task for ${skill}, in free text`, required: true }],
      });
    }
  }

  return prompts;
}

/** The prompt text for an area command name, or undefined. */
export function areaPromptText(name) {
  return listAreaPrompts().find((prompt) => prompt.name === name)?.text;
}
