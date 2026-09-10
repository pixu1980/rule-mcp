

/** @module core/review/template/fill */

import { templateLines } from "./_lines.js";
import { operationSection } from "./_operation.js";

/**
 * Fill the template for one role and operation.
 *
 * @param {object} role - a registry entry
 * @param {{ years?: number, skills?: string[], topic?: string, operation?: "all"|"plan"|"audit"|"review" }} [overrides]
 * @returns {string} the prompt this role's surfaces all carry
 */
export function fillRoleTemplate(role, overrides = {}) {
  if (!role) {
    throw new Error("fillRoleTemplate needs a role");
  }

  const years = overrides.years ?? role.yearsOfExperience;
  const skills = [...(role.skills ?? []), ...(overrides.skills ?? [])];
  const operation = overrides.operation ?? "all";

  const filled = templateLines(operation).replace("{{ROLE}}", role.role).replace("{{YEARS_OF_EXPERIENCE}}", String(years)).replace("{{SKILLS}}", skills.join(", "));

  const lenses = (role.lenses ?? []).map((lens) => `- ${lens}`);
  const evidence = (role.evidenceSkills ?? []).map((skill) => `- ${skill}`);

  return [
    filled,
    "",
    "## What this role looks at",
    "",
    ...(lenses.length > 0 ? lenses : ["- the whole project, through this role's expertise"]),
    ...(overrides.topic ? ["", `Focus this run on: ${overrides.topic}`] : []),
    "",
    "## Evidence to load first",
    "",
    "Load these rule skills before auditing, and treat them as source of truth:",
    "",
    ...(evidence.length > 0 ? evidence : ["- route with `rule` and use what it returns"]),
    ...operationSection(role, operation),
    "",
    "Where a decision belongs to the user, stop and ask instead of guessing.",
    "",
    "Finish by proposing a conventional commit with a mandatory scope for the documents this run wrote,",
    `for example \`docs(${role.id}): ${operation === "all" ? "audit, review and plan" : operation}\`.`,
  ].join("\n");
}
