

/**
 * @module scripts/reports/census/_sections-surface-map
 *
 * One table that joins slash commands, MCP tools, and catalog skills.
 *
 * Leaf skills have no slash command (ADR 117); they appear with an empty
 * Command cell. Area hubs and session commands carry the command that reaches
 * them. Action tools that are not skill-minted fill Command from a fixed map
 * when a slash exists.
 */

import { firstSentence, table, toolOf } from "./_format.mjs";
import { commandDefinition, getSkillMetadata, listAreaPrompts } from "./_registries.mjs";

/** Session / check / router commands that name an action tool directly. */
const COMMAND_TO_TOOL = {
  rule: "pix_tool",
  "rule-check": "rule_tool_check",
  "rule-compress": "rule_tool_compress",
  "rule-handoff": "rule_tool_handoff",
  "rule-handon": "rule_tool_handon",
  "rule-init": "rule_tool_init",
  "rule-stats": "rule_tool_stats",
  "rule-usage": "rule_tool_usage",
  "rule-update": "rule_tool_update",
};

/**
 * @param {string} value
 * @returns {string}
 */
const dash = (value) => (value ? `\`${value}\`` : "-");

/**
 * Rows for the public surface map: Command | Tool | Skill | Description.
 *
 * @param {object} data - gathered census surface
 * @returns {string[]}
 */
export function surfaceMapSection(data) {
  const areaByCommand = new Map(listAreaPrompts().map((area) => [area.name, area]));
  const toolByName = new Map(data.tools.map((tool) => [tool.name, tool]));
  const skillsCovered = new Set();
  const rows = [];

  for (const name of data.commands) {
    const definition = commandDefinition(name);
    const area = areaByCommand.get(name);
    let tool = "";
    let skill = "";

    if (area?.skill) {
      skill = area.skill;
      tool = toolOf(skill);
      skillsCovered.add(skill);
    } else if (COMMAND_TO_TOOL[name]) {
      tool = COMMAND_TO_TOOL[name];
      if (name === "rule" && data.skillDirs.includes("rule")) {
        skill = "rule";
      }
    }

    rows.push([dash(name), dash(tool), dash(skill), firstSentence(definition.description)]);
  }

  for (const name of data.catalog) {
    if (skillsCovered.has(name)) {
      continue;
    }

    const meta = getSkillMetadata(name) ?? {};
    const tool = toolOf(name);
    const description = meta.description || toolByName.get(tool)?.description || "";

    rows.push(["-", dash(tool), dash(name), firstSentence(description)]);
  }

  for (const tool of data.actionTools) {
    const already = rows.some((row) => row[1] === dash(tool.name));

    if (already) {
      continue;
    }

    rows.push(["-", dash(tool.name), "-", firstSentence(tool.description)]);
  }

  return [
    `## Command / Tool / Skill map (${rows.length})`,
    "",
    "One row per slash command, then every catalog skill that has no slash of its",
    "own (ADR 117: leaf skills are reached through area hubs or the router), then",
    "any remaining action tools. An empty cell is `-`.",
    "",
    "Regenerate with `pnpm census`.",
    "",
    ...table(["Command", "Tool", "Skill", "Description"], rows),
    "",
  ];
}
