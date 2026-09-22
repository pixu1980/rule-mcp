

/**
 * @module scripts/reports/census/_registries
 *
 * The live registries the census counts, and the readers that turn a registry
 * into something a table can hold.
 *
 * Loading happens here so the sections import data rather than reaching into
 * `src/` themselves, and so the telemetry and auto-update opt-outs are set
 * before the first module reads them.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.RULE_MCP_NO_TELEMETRY ??= "1";
process.env.RULE_MCP_NO_AUTOUPDATE ??= "1";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Where the census writes. Overridden so a test can render into a copy of the tree. */
export const DOCS = process.env.RULE_MCP_CENSUS_DOCS_DIR || join(ROOT, "docs");

export const { loadAllSkills, getSkillMetadata } = await import("../../../src/core/skills/index.js");
export const { bootstrapCoreTools } = await import("../../../src/tools/_bootstrap.js");
export const { listTools } = await import("../../../src/tools/router/index.js");
export const { listResources } = await import("../../../src/resources/index.js");
export const { listPrompts } = await import("../../../src/prompts/index.js");
export const { allRoles, activeRoles, parsePersonaCommand, personaCommandName } = await import("../../../src/core/review/roles/index.js");
export const { OPERATIONS } = await import("../../../src/core/review/template/index.js");
export const { commandNames, ROUTER_COMMAND } = await import("../../../src/core/agents/commands/index.js");
export const { COMMAND_TARGETS, AGENTS_WITHOUT_COMMAND_SURFACE } = await import("../../../src/core/agents/command-targets/index.js");
export const { HOOK_EVENTS, hookEntries } = await import("../../../src/core/agents/index.js");
export const { listExistingAdrs } = await import("../../../src/tools/adr/index.js");
export const { buildProgram } = await import("../../../src/cli/index.js");

const guardrails = await import("../../../src/core/guardrails/index.js");

/**
 * The role a persona name addresses, or nothing when the name is not one.
 * Canonical form: `rule-persona-<role>-<operation>` (ADR 113).
 *
 * @param {string} name
 * @returns {{operation: string, role: string} | undefined}
 */
export function parsePersonaName(name) {
  const found = parsePersonaCommand(name);

  return found ? { operation: found.operation, role: found.roleId } : undefined;
}

/** Every guardrail id, with the families that carry it. */
export function guardrailFamilies() {
  const families = [];

  for (const [key, value] of Object.entries(guardrails)) {
    if (key.endsWith("GUARDRAILS") && Array.isArray(value)) {
      families.push([key.replace("_GUARDRAILS", "").toLowerCase(), value]);
    }
  }

  for (const [framework, rules] of Object.entries(guardrails.FRAMEWORK_GUARDRAILS ?? {})) {
    if (families.every(([name]) => name !== framework)) {
      families.push([`framework:${framework}`, rules]);
    }
  }

  return families.sort(([left], [right]) => left.localeCompare(right));
}

/**
 * The CLI commands, read from the commander program itself rather than from a
 * second declaration beside it: the parser owns both what parses and what
 * `--help` prints, so anything this document says about a flag is what the
 * binary actually reads.
 *
 * @returns {Array<{name: string, summary: string, args: object[], options: object[]}>}
 */
export function cliCommands() {
  const seen = new Set();
  const commands = [];

  for (const command of buildProgram().commands) {
    const name = command.name();

    if (seen.has(name)) {
      continue;
    }

    seen.add(name);
    commands.push({
      name,
      summary: command.description() ?? "",
      args: (command._args ?? []).map((argument) => ({
        name: String(argument.name()),
        description: argument.description,
        default: argument.defaultValue,
      })),
      options: (command.options ?? []).map((option) => ({
        flags: option.flags,
        description: option.description,
        default: option.defaultValue,
        choices: option.argChoices,
      })),
    });
  }

  return commands;
}

/**
 * Resources split into the two kinds that exist: the fixed indexes, and the
 * pair every catalog skill mints. Listing the per-skill ones individually would
 * restate the skill table one row at a time.
 *
 * @param {Array<{uri: string, name?: string}>} resources
 * @param {string[]} skillDirs - every skill directory name
 * @returns {{fixed: Array<object>, perSkill: number}}
 */
export function resourceKinds(resources, skillDirs) {
  const skills = new Set(skillDirs);
  const fixed = [];
  let perSkill = 0;

  for (const resource of resources) {
    const prefix = String(resource.uri)
      .replace(/^rule:\/\//, "")
      .split("/", 1)[0];

    if (skills.has(prefix)) {
      perSkill += 1;
      continue;
    }

    fixed.push(resource);
  }

  return { fixed, perSkill };
}
