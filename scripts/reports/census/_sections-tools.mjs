/**
 * @module scripts/reports/census/_sections-tools
 *
 * The tool reference: every action tool with the parameters it takes, and the
 * one-per-skill tools grouped by area.
 *
 * The parameters come from the same `inputSchema` the MCP client validates
 * against, so a reader of this page and a model calling the tool are working
 * from one description.
 */

import { cell, firstSentence, table, toolOf } from "./_format.mjs";

/** A markdown anchor for the heading the tool section writes. */
const anchor = (name) => `#${name.replaceAll("_", "")}`;

/** `string`, `"a" | "b"`, `array of string`: what the schema says, in one cell. */
function typeOf(schema) {
  // Pipes are escaped by `cell`, which owns the table syntax: escaping here too
  // would put a backslash in the rendered cell and split the row.
  if (Array.isArray(schema.enum)) {
    return schema.enum.map((value) => `\`${value}\``).join(" | ");
  }

  if (schema.type === "array") {
    return `array of ${schema.items?.type ?? "value"}`;
  }

  return schema.type ?? "any";
}

/** One tool's parameters, or a line saying it takes none. */
function parameters(schema) {
  const properties = Object.entries(schema?.properties ?? {});

  if (properties.length === 0) {
    return ["Takes no parameters.", ""];
  }

  const required = new Set(schema.required ?? []);

  return [
    ...table(
      ["Parameter", "Type", "Required", "Default", "Description"],
      properties.map(([name, property]) => [
        `\`${name}\``,
        typeOf(property),
        required.has(name) ? "yes" : "no",
        property.default === undefined ? "-" : `\`${JSON.stringify(property.default)}\``,
        cell(property.description ?? ""),
      ]),
    ),
    "",
  ];
}

/** Every action tool, with what it does and what it takes. */
export function actionToolSection(data) {
  return [
    `## Action tools (${data.actionTools.length})`,
    "",
    "The tools that do something rather than serve a skill. Every one is",
    "deterministic: none of them calls a model, so the same arguments return the",
    "same result behind any client.",
    "",
    ...table(
      ["Tool", "What it does"],
      data.actionTools.map((tool) => [`[\`${tool.name}\`](${anchor(tool.name)})`, firstSentence(tool.description)]),
    ),
    "",
    "Call any of them from a shell with `rule-mcp tools call <name> --json '{...}'`.",
    "",
    ...data.actionTools.flatMap((tool) => [`### ${tool.name}`, "", cell(tool.description), "", ...parameters(tool.inputSchema)]),
  ];
}

/** One tool per catalog skill, grouped by the area the skill belongs to. */
export function skillToolSection(data) {
  const [sample] = data.skillTools;

  return [
    `## Skill tools (${data.skillTools.length})`,
    "",
    "One per catalog skill, generated from the directory. Each serves its",
    "`SKILL.md` and the sections a route selected, and every one takes the same",
    "arguments, so they are listed by area rather than one heading at a time.",
    "The catalog itself, with what each skill covers, is",
    "[`06-skills.md`](06-skills.md).",
    "",
    ...table(
      ["Area", "Tools"],
      [...data.areas.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([area, names]) => [area, names.map((name) => `\`${toolOf(name)}\``).join(", ")]),
    ),
    "",
    `### Arguments, the same for all ${data.skillTools.length}`,
    "",
    ...parameters(sample?.inputSchema),
  ];
}
