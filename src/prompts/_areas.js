

/**
 * @module prompts/areas
 *
 * One MCP/slash prompt per area hub, grouped from skill names.
 *
 * The area is already in the name: `rule-frontend-react` is frontend, and
 * `rule-frontend` is frontend itself. Deriving the grouping means a skill that
 * joins any layer - this repository, a project, a user's own - joins its area
 * without a second place remembering it.
 *
 * The hub skill owns its area's command: `/rule-area-frontend` IS `rule-frontend`.
 * Leaf skills keep their tools; the hub routes to them from free text (ADR 117).
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
 * The slash/MCP area command a skill routes through (always the hub; ADR 117).
 *
 * @param {string} skillName
 * @returns {string|null}
 */
export function areaCommandName(skillName) {
  const parsed = areaOf(skillName);

  if (!parsed) {
    return null;
  }

  return `rule-area-${parsed.area}`;
}

/**
 * Skill name → MCP tool name (`rule-frontend-react` → `rule_tool_frontend_react`).
 *
 * @param {string} skillName
 * @returns {string|null}
 */
export function skillToolName(skillName) {
  if (typeof skillName !== "string" || !skillName.startsWith("rule-")) {
    return null;
  }

  return `rule_tool_${skillName.slice("rule-".length).replaceAll("-", "_")}`;
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

/** Readable skill + tool pairs for hub routing prose. */
function memberRoutingList(members) {
  const pairs = members.map((skill) => `\`${skill}\` / \`${skillToolName(skill)}\``);
  const shown = pairs.slice(0, 12);

  return pairs.length > shown.length ? `${shown.join(", ")}, and ${pairs.length - shown.length} more` : shown.join(", ");
}

/** The lines every area hub prompt shares: route leaves from free text, check, commit. */
function hubPromptLines(area, hub, members) {
  const evidence =
    members.length > 0
      ? `the hub \`${hub}\` and whichever leaf skills the request names: ${memberRoutingList(members)}`
      : `the \`${hub}\` skill`;

  return [
    `You are the ${area} area specialist for rule-mcp (collector slash only; ADR 117).`,
    `Route this request through \`pix_tool\` first, then load ${evidence} as source of truth.`,
    "The request is free text: extract every framework, platform, database or tool it names (e.g. rspack, pnpm, eslint, husky, react) and call the matching leaf `rule_tool_*` / load that skill; call several when the request spans several leaves. Never invent APIs, files, dependencies, commands, or requirements not present in the skill evidence.",
    "If the request is a check (whole tokens such as check, controlla, validate, verify, guardrail, lint), call `rule_tool_check` on the named paths or the git diff against the routed skill(s) and skip the implement path (ADR 116).",
    "Baseline: involve TDD (write failing tests first) and a11y (WCAG 2.2 AA, axe-core where applicable). If the request has no test/a11y surface, ask the user what to cover before finishing.",
    "Validate generated code with `rule_tool_check` and iterate until all guardrails pass.",
    "Compression is implicit: if the user is working in compression mode, keep the response compressed.",
    `When the work is done, propose a conventional commit message with a mandatory scope, e.g. "feat(${area}): ...".`,
  ].join("\n");
}

/**
 * One prompt per area hub only (ADR 117). Leaf skills stay as tools, not slash.
 *
 * @returns {Array<{ name: string, description: string, text: string, skill: string, area: string, members: string[], arguments: object[] }>}
 */
export function listAreaPrompts() {
  const prompts = [];

  for (const [area, entry] of skillAreas()) {
    if (!entry.hub) {
      continue;
    }

    const members = [...entry.members].sort((a, b) => a.localeCompare(b));

    prompts.push({
      name: `rule-area-${area}`,
      skill: entry.hub,
      area,
      members,
      description: `${area} work: route free text to the right ${area} leaf skills/tools`,
      text: hubPromptLines(area, entry.hub, members),
      arguments: [{ name: "request", description: `A ${area} task, in free text (name leaves like rspack/pnpm/react when known)`, required: true }],
    });
  }

  return prompts;
}

/** The prompt text for an area command name, or undefined. */
export function areaPromptText(name) {
  return listAreaPrompts().find((prompt) => prompt.name === name)?.text;
}
