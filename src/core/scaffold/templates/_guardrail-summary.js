

/** @module core/scaffold/templates/guardrail-summary */

import { checkCode } from "../../guardrails/index.js";

/** Framework -> canonical skill name, so component output is validated against
 *  the same guardrails the agent's own code would face. */
const FRAMEWORK_SKILL = {
  react: "rule-frontend-react",
  vue: "rule-frontend-vue",
  svelte: "rule-frontend-svelte",
  angular: "rule-frontend-angular",
  solid: "rule-frontend-solidjs",
  astro: "rule-meta-astro",
  vanilla: "rule-styleguide",
};

/**
 * Validate generated template code against its skill's guardrails and return a
 * short compliance summary. Guarantees guardrails are ALWAYS involved in
 * component generation, not only when the agent later calls pix_check.
 *
 * @param {string} framework
 * @param {string} code - the emitted code (concatenated for multi-file)
 * @returns {string} markdown summary line(s)
 */
export function guardrailSummary(framework, code) {
  const skillName = FRAMEWORK_SKILL[framework] || "rule-styleguide";
  const report = checkCode(skillName, code, { framework, isComponent: true });

  if (report.allPass) {
    return `## Guardrails\n\n✅ ${report.passCount}/${report.total} guardrails pass (${skillName}). Validated with pix_check.`;
  }

  const lines = [`## Guardrails\n\n⚠️ ${report.failCount}/${report.total} FAIL (${skillName}). Fix before shipping:`];

  for (const f of report.failed) {
    lines.push(`- **${f.id}**: ${f.label} - ${f.suggestion}`);
  }

  return lines.join("\n");
}
