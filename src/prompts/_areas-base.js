/**
 * @module prompts/areas-base
 *
 * The skill-name to area mapping behind the area prompts.
 *
 * The area is already in the name: `rule-mcp-frontend-react` is frontend, and
 * `rule-mcp-frontend` is frontend itself. Deriving the grouping means a skill that
 * joins any layer - this repository, a project, a user's own - joins its area
 * without a second place remembering it.
 */

import { getSkillNames } from "../tools/router/index.js";

/** The router skill backs the dispatcher, not an area. */
const ROUTER = "rule-mcp";

/**
 * The area a skill belongs to, and what it is called inside it.
 *
 * @param {string} skillName
 * @returns {{ area: string, member: string }|null} null when the name is not a skill of ours
 */
export function areaOf(skillName) {
  if (typeof skillName !== "string" || !skillName.startsWith("rule-mcp-")) {
    return null;
  }

  const rest = skillName.slice("rule-mcp-".length);
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
 * Skill name -> MCP tool name (`rule-mcp-frontend-react` -> `rule_tool_frontend_react`).
 *
 * @param {string} skillName
 * @returns {string|null}
 */
export function skillToolName(skillName) {
  if (typeof skillName !== "string" || !skillName.startsWith("rule-mcp-")) {
    return null;
  }

  return `rule_tool_${skillName.slice("rule-mcp-".length).replaceAll("-", "_")}`;
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
