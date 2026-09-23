// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/**
 * @module prompts/areas-base
 *
 * The skill-name to area mapping behind the area prompts.
 *
 * The area is already in the name: `pix-frontend-react` is frontend, and
 * `pix-frontend` is frontend itself. Deriving the grouping means a skill that
 * joins any layer - this repository, a project, a user's own - joins its area
 * without a second place remembering it.
 */

import { getSkillNames } from "../tools/router/index.js";

/** The router skill backs the dispatcher, not an area. */
const ROUTER = "pix";

/**
 * The area a skill belongs to, and what it is called inside it.
 *
 * @param {string} skillName
 * @returns {{ area: string, member: string }|null} null when the name is not a skill of ours
 */
export function areaOf(skillName) {
  if (typeof skillName !== "string" || !skillName.startsWith("pix-")) {
    return null;
  }

  const rest = skillName.slice("pix-".length);
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

  return `pix-area-${parsed.area}`;
}

/**
 * Skill name → MCP tool name (`pix-frontend-react` → `pix_tool_frontend_react`).
 *
 * @param {string} skillName
 * @returns {string|null}
 */
export function skillToolName(skillName) {
  if (typeof skillName !== "string" || !skillName.startsWith("pix-")) {
    return null;
  }

  return `pix_tool_${skillName.slice("pix-".length).replaceAll("-", "_")}`;
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
