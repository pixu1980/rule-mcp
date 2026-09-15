

/** @module core/guardrails/engine/report - the ruleset rendered as text */

import { getGuardrails, skillChain } from "./_registry.js";

/**
 * Render the guardrail ruleset for a skill as text.
 *
 * The list is what `getGuardrails` resolved, which is the only answer that
 * cannot drift: it is the same set the check will run. Rules a skill owns or
 * inherits are named with the skill they came from, so a reader can see which
 * declaration to edit (ADR 079).
 *
 * @param {string} skillName
 * @param {string} [mode]
 * @returns {string}
 */
export function getGuardrailsReport(skillName, mode) {
  const guardrails = getGuardrails(skillName, mode);
  const chain = skillChain(skillName);

  const lines = [`# Guardrails: ${skillName}`, "", `Total: ${guardrails.length} testable assertions`, ""];

  if (chain.length > 1) {
    lines.push(`Inherited from: ${chain.slice(0, -1).join(", ")}`, "");
  }

  lines.push("## Rules", "");

  for (const guardrail of guardrails) {
    lines.push(`- [ ] **${guardrail.id}**: ${guardrail.label}`);

    if (guardrail.description) {
      lines.push(`  ${guardrail.description}`);
    }

    lines.push("");
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
