/**
 * @module scripts/reports/census/_sections-surface
 *
 * The sections that describe what the server serves: the counted summary, the
 * skill catalog, and the prompts.
 */

import { AREA_SUBJECT } from "./_areas.data.mjs";
import { firstSentence, table, toolOf } from "./_format.mjs";
import { COMMAND_TARGETS, HOOK_EVENTS, OPERATIONS, activeRoles, cliCommands, getSkillMetadata } from "./_registries.mjs";

/** The counted summary, and the one number that needs explaining. */
export function summarySection(data) {
  return [
    "## Surface at a glance",
    "",
    ...table(
      ["Surface", "Count", "Defined in"],
      [
        ["MCP tools", data.tools.length, "`src/tools/*` via `src/tools/router/index.js`"],
        ["- action tools", data.actionTools.length, "one per module, registered explicitly"],
        ["- skill tools", data.skillTools.length, "one per catalog skill, generated"],
        ["MCP resources", data.resources.length, "`src/resources/index.js`"],
        ["MCP prompts", data.prompts.length, "`src/prompts/index.js`"],
        ["- reusable", data.reusablePrompts.length, "workflow and area prompts"],
        ["- persona", data.personaPrompts.length, `${activeRoles().length} active roles x ${OPERATIONS.length} operations`],
        ["Skills", data.catalog.length, "`skills/rule-*/SKILL.md`"],
        ["Review personas", data.roles.length, "`src/core/review/roles/index.js`"],
        ["Guardrail rules", data.guardrailIds.size, "`src/core/guardrails/index.js`"],
        ["Agent slash commands", data.commands.length, "`src/core/agents/commands/index.js`"],
        ["Agent/IDE command targets", COMMAND_TARGETS.length, "`src/core/agents/command-targets/index.js`"],
        ["CLI commands", cliCommands().length, "`src/cli/_program.js`"],
        ["Hook events", HOOK_EVENTS.length, "`src/core/agents/_hooks.js`"],
        ["Architecture decisions", data.adrs.length, "[`docs/adr/ADR.md`](adr/ADR.md)"],
      ].map((row) => row.map(String)),
    ),
    "",
  ];
}

/** The catalog, grouped the way the areas already group it. */
export function skillCatalogSection(data) {
  const areas = [...data.areas.entries()].sort(([left], [right]) => left.localeCompare(right));

  return [
    `## Skills (${data.catalog.length})`,
    "",
    "The catalog. A skill is the source of truth for its topic; the tool that",
    "serves it carries no rules of its own, and the guardrails it is checked",
    "against are in [`14-guardrails.md`](14-guardrails.md).",
    "",
    "The router's own directory, `skills/rule/`, mints no skill tool, which is why",
    `the catalog is ${data.catalog.length} and the directory count is ${data.skillDirs.length}.`,
    "",
    ...table(
      ["Area", "Skills", "Covers"],
      areas.map(([area, names]) => [`[${area}](#${area})`, names.length, AREA_SUBJECT[area] ?? ""]),
    ),
    "",
    ...areas.flatMap(([area, names]) => [
      `### ${area}`,
      "",
      ...table(
        ["Skill", "Tool", "Frameworks", "Description"],
        names.map((name) => {
          const meta = getSkillMetadata(name) ?? {};

          return [`\`${name}\``, `\`${toolOf(name)}\``, (meta.frameworks ?? []).join(", ") || "-", meta.description ?? ""];
        }),
      ),
      "",
    ]),
  ];
}

/** The prompt surface, reusable and generated. */
export function promptSection(data) {
  return [
    `## MCP prompts (${data.prompts.length})`,
    "",
    `${data.reusablePrompts.length} reusable prompts, plus ${data.personaPrompts.length} generated from the persona registry.`,
    "Claude Code installs clean `/rule-*` commands instead and suppresses these",
    "(ADR 029), so the two names are deliberately the same.",
    "",
    "### Reusable",
    "",
    ...table(
      ["Prompt", "Arguments", "Description"],
      data.reusablePrompts.map((prompt) => [
        `\`/${prompt.name}\``,
        (prompt.arguments ?? []).map((argument) => (argument.required ? `<${argument.name}>` : `[${argument.name}]`)).join(" ") || "-",
        firstSentence(prompt.description),
      ]),
    ),
    "",
    "### Persona, one per role and operation",
    "",
    "An operation is a prefix of the trio (ADR 057): `audit` writes `docs/audits/`",
    "and stops, `review` adds `docs/reviews/`, `plan` adds `docs/plans/`. Each",
    "takes an optional free-text `request` naming the focus for the run.",
    "",
    ...table(
      ["Role", ...OPERATIONS],
      activeRoles().map((role) => [`\`${role.id}\``, ...OPERATIONS.map((operation) => `\`/rule-${operation}-${role.id}\``)]),
    ),
    "",
  ];
}
