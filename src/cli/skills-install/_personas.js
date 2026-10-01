

/**
 * @module cli/skills-install/personas
 *
 * Generate one persona skill per active role into the skills target directory.
 *
 * The persona commands are generated per agent as slash commands; an IDE that
 * has no slash commands, and a `~/.agents/skills` install, had no persona
 * surface at all. These skills fill that gap. They never mint a tool - the
 * operation tool is `rule_tool_plan` (with `rule_tool_audit` and
 * `rule_tool_review` for callers that pin one) - so `exposeTool: false` keeps
 * the tool list unchanged.
 *
 * One skill per role: the depth of the run is read from the request, not from
 * the skill name (ADR 120), so the 57 per-operation skills collapse to 19.
 */

import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { PLAN_INTENT_KEYWORDS_LIST, REVIEW_INTENT_KEYWORDS_LIST, activeRoles, personaCommandName } from "../../core/review/roles/index.js";

/** The `SKILL.md` body for one role. */
const skillContent = (role) => {
  const name = personaCommandName(role.id);

  return [
    "---",
    `name: ${name}`,
    "description: >-",
    `  Audit, review and plan as a ${role.role}. Generated from the persona registry; call \`rule_tool_plan\` with \`role: "${role.id}"\` and the request as \`topic\` - the request decides how deep the run goes.`,
    "tags:",
    "  - persona",
    `  - ${role.id}`,
    "frameworks: [all]",
    "exposeTool: false",
    "---",
    "",
    `# Audit, review and plan as a ${role.role}`,
    "",
    `Call \`rule_tool_plan\` with \`role: "${role.id}"\`, the \`operation\` the request asks for, and the request as \`topic\`.`,
    "",
    "Depth intent: whole tokens, case-insensitive.",
    `- a plan ask (${PLAN_INTENT_KEYWORDS_LIST}): \`operation: "plan"\` - the audit, then the review, then the plan.`,
    `- otherwise a review ask (${REVIEW_INTENT_KEYWORDS_LIST}): \`operation: "review"\` - the audit, then the review.`,
    '- otherwise: `operation: "audit"`.',
    "",
    "Then follow the returned contract: load the evidence skills it names, measure rather than assume,",
    "call `rule_tool_impersonation` with the findings, and finish with a conventional commit.",
    "",
  ].join("\n");
};

/**
 * Remove persona skill dirs that no longer name a role: the per-operation
 * `rule-persona-<role>-<operation>` dirs, and the older
 * `rule-{plan|audit|review}-*` names that predate them (ADR 120, ADR 116).
 *
 * @param {string} targetDir
 * @param {boolean} dryRun
 * @returns {string[]} removed names
 */
function purgeLegacyPersonaSkills(targetDir, dryRun) {
  if (!existsSync(targetDir)) {
    return [];
  }

  const current = new Set(activeRoles().map((role) => personaCommandName(role.id)));
  const removed = [];

  for (const entry of readdirSync(targetDir)) {
    const oldShape = /^rule-(plan|audit|review)-/.test(entry);
    const stalePersona = entry.startsWith("rule-persona-") && !current.has(entry);

    if (!oldShape && !stalePersona) {
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
 * Write one persona skill per active role.
 *
 * @param {string} targetDir - The skills directory (`~/.agents/skills`)
 * @param {{ roles?: object[], dryRun?: boolean }} [options]
 * @returns {string[]} the skill names written
 */
export function generatePersonaSkills(targetDir, { roles = activeRoles(), dryRun = false } = {}) {
  purgeLegacyPersonaSkills(targetDir, dryRun);

  const written = [];

  for (const role of roles) {
    const name = personaCommandName(role.id);

    if (!dryRun) {
      mkdirSync(join(targetDir, name), { recursive: true });
      writeFileSync(join(targetDir, name, "SKILL.md"), skillContent(role));
    }

    written.push(name);
  }

  return written;
}
