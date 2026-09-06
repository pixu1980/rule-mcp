/** @module core/guardrails/engine/report - the ruleset rendered as text */

import { SHARED_GUARDRAILS } from "../shared/index.js";
import { SCAFFOLD_GUARDRAILS } from "../_scaffold.js";
import { BACKEND_GUARDRAILS } from "../backend/index.js";
import { DATABASE_GUARDRAILS } from "../_database.js";
import { DEVOPS_GUARDRAILS } from "../_devops.js";
import { FRAMEWORK_GUARDRAILS } from "../framework/index.js";
import { getGuardrails, SKILL_FRAMEWORK_MAP } from "./_registry.js";

/**
 * Render the guardrail ruleset for a skill as text.
 *
 * @param {string} skillName
 * @param {string} [mode]
 * @returns {string}
 */
export function getGuardrailsReport(skillName, mode) {
  const guardrails = getGuardrails(skillName, mode);
  const lines = [
    `# Guardrails: ${skillName}`,
    "",
    `Total: ${guardrails.length} testable assertions`,
    "",
    "## Shared (all rule skills)",
    "",
  ];

  for (const g of SHARED_GUARDRAILS) {
    lines.push(`- [ ] **${g.id}**: ${g.label}`, `  ${g.description}`, "");
  }

  const framework = SKILL_FRAMEWORK_MAP[skillName];
  const fg = FRAMEWORK_GUARDRAILS[framework] || [];

  if (fg.length > 0) {
    lines.push(`## Framework-specific (${framework})`, "");

    for (const g of fg) {
      lines.push(`- [ ] **${g.id}**: ${g.label}`, `  ${g.description}`, "");
    }
  }

  if (skillName === "rule-styleguide") {
    lines.push(`## Project Scaffolding (${SCAFFOLD_GUARDRAILS.length} config files)`, "");

    for (const g of SCAFFOLD_GUARDRAILS) {
      lines.push(`- [ ] **${g.id}**: ${g.label}`, `  ${g.description}`, "");
    }

    lines.push("Run `pix_styleguide mode=scaffold` to generate these files.", "");
  }

  if (/^rule-(?:backend|backend-)/.test(skillName)) {
    lines.push(`## Backend Security & API (${BACKEND_GUARDRAILS.length} checks)`, "");

    for (const g of BACKEND_GUARDRAILS) {
      lines.push(`- [ ] **${g.id}**: ${g.label}`, `  ${g.description}`, "");
    }
  }

  if (/^rule-data(?:-|$)/.test(skillName)) {
    lines.push(`## Database Safety (${DATABASE_GUARDRAILS.length} checks)`, "");

    for (const g of DATABASE_GUARDRAILS) {
      lines.push(`- [ ] **${g.id}**: ${g.label}`, `  ${g.description}`, "");
    }
  }

  if (/^rule-devops(?:-|$)/.test(skillName)) {
    lines.push(`## DevOps & Security (${DEVOPS_GUARDRAILS.length} checks)`, "");

    for (const g of DEVOPS_GUARDRAILS) {
      lines.push(`- [ ] **${g.id}**: ${g.label}`, `  ${g.description}`, "");
    }
  }

  lines.push(
    "## How to use",
    "",
    "1. Generate code following rule AI principles.",
    "2. Run `pix_<skill> check` on the generated code.",
    "3. Fix any FAIL results.",
    "4. Re-check until all pass (allPass: true).",
    "",
  );

  return lines.join("\n");
}
