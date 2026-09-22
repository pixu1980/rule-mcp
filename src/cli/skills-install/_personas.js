

/**
 * @module cli/skills-install/personas
 *
 * Generate one persona skill per active role and operation into the skills
 * target directory.
 *
 * The persona commands are generated per agent as slash commands; an IDE that
 * has no slash commands, and a `~/.agents/skills` install, had no persona
 * surface at all. These skills fill that gap. They never mint a tool - the
 * operation tools are `rule_tool_plan`, `rule_tool_audit` and `rule_tool_review` -
 * so `exposeTool: false` keeps the tool list unchanged.
 */

import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { activeRoles, personaCommandName, parsePersonaCommand } from "../../core/review/roles/index.js";
import { OPERATIONS } from "../../core/review/template/index.js";

/** The tool that serves one operation. */
const toolFor = (operation) => (operation === "audit" ? "rule_tool_audit" : operation === "review" ? "rule_tool_review" : "rule_tool_plan");

/** The `SKILL.md` body for one role and operation. */
const skillContent = (role, operation) => {
  const tool = toolFor(operation);
  const name = personaCommandName(role.id, operation);
  const call = operation === "plan" ? `with \`role: "${role.id}"\` and the request as \`topic\`` : `with \`role: "${role.id}"\``;

  return [
    "---",
    `name: ${name}`,
    "description: >-",
    `  ${operation} as a ${role.role}. Generated from the persona registry; call \`${tool}\` ${call}.`,
    "tags:",
    "  - persona",
    `  - ${operation}`,
    `  - ${role.id}`,
    "frameworks: [all]",
    "exposeTool: false",
    "---",
    "",
    `# ${operation} as a ${role.role}`,
    "",
    `Call \`${tool}\` ${call}.`,
    "",
    "Then follow the returned contract: load the evidence skills it names, measure rather than assume,",
    "call `rule_tool_plan_docs` with the findings, and finish with a conventional commit.",
    "",
  ].join("\n");
};

/**
 * Remove legacy `rule-{plan|audit|review}-*` persona skill dirs that predate
 * the `rule-persona-<role>-<op>` naming.
 *
 * @param {string} targetDir
 * @param {boolean} dryRun
 * @returns {string[]} removed names
 */
function purgeLegacyPersonaSkills(targetDir, dryRun) {
  if (!existsSync(targetDir)) {
    return [];
  }

  const removed = [];

  for (const entry of readdirSync(targetDir)) {
    const legacy = /^rule-(plan|audit|review)-/.test(entry);
    const alreadyNew = parsePersonaCommand(entry);

    if (!legacy || alreadyNew) {
      continue;
    }

    if (!dryRun) {
      rmSync(join(targetDir, entry), { recursive: true, force: true });
    }

    removed.push(entry);
  }

  return removed;
}

/**
 * Write one persona skill per active role and operation.
 *
 * @param {string} targetDir - The skills directory (`~/.agents/skills`)
 * @param {{ roles?: object[], operations?: string[], dryRun?: boolean }} [options]
 * @returns {string[]} the skill names written
 */
export function generatePersonaSkills(targetDir, { roles = activeRoles(), operations = OPERATIONS, dryRun = false } = {}) {
  purgeLegacyPersonaSkills(targetDir, dryRun);

  const written = [];

  for (const role of roles) {
    for (const operation of operations) {
      const name = personaCommandName(role.id, operation);

      if (!dryRun) {
        mkdirSync(join(targetDir, name), { recursive: true });
        writeFileSync(join(targetDir, name, "SKILL.md"), skillContent(role, operation));
      }

      written.push(name);
    }
  }

  return written;
}
