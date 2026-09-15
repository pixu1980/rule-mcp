

/** @module core/review/template/fill */

import { templateLines } from "./_lines.js";
import { operationSection } from "./_operation.js";

/**
 * The binding-scope section: the topic is a constraint, not a suggestion.
 * Everything outside it is off limits, with a one-line escape valve so the
 * model does not widen the scope to avoid losing a finding.
 */
function scopeSection(topic) {
  return [
    "",
    "## Scope: binding",
    "",
    `This run covers ONLY: ${topic}.`,
    "Everything outside this scope is out of scope: do not read it, do not audit it, and do not report",
    "findings on it. If something outside the scope demands attention, record it in one line under an",
    '"Out of scope observations" heading in the document and move on - no investigation.',
  ];
}

/**
 * How to turn the scope into concrete files and symbols. The generator is
 * deterministic and cannot call tokensave itself; when the caller detected
 * `.tokensave/` it states availability, otherwise the run checks first.
 */
function resolveScopeSection(tokensave) {
  const opening =
    tokensave === "available"
      ? ["tokensave is initialized in this project. Map the scope to concrete files and symbols before"]
      : ["If the tokensave MCP tools are available (`tokensave_status` answers), map the scope to concrete", "files and symbols before"];

  return [
    "",
    "## Resolve the scope",
    "",
    ...opening,
    "working: `tokensave_context` with the scope as the query returns the symbols and snippets that",
    "are this run's surface; `tokensave_files` and `tokensave_impact` enumerate the files and",
    "dependents inside it. Without tokensave, enumerate the scope with targeted reads - never a",
    "whole-project scan.",
  ];
}

/**
 * Fill the template for one role and operation.
 *
 * With a `topic` the run is scoped: the topic becomes the binding scope in the
 * action line, a dedicated scope section, the lens framing and the operation
 * contract. Without one the output is byte for byte what it always was.
 *
 * @param {object} role - a registry entry
 * @param {{ years?: number, skills?: string[], topic?: string, operation?: "all"|"plan"|"audit"|"review", tokensave?: "available" }} [overrides]
 * @returns {string} the prompt this role's surfaces all carry
 */
export function fillRoleTemplate(role, overrides = {}) {
  if (!role) {
    throw new Error("fillRoleTemplate needs a role");
  }

  const years = overrides.years ?? role.yearsOfExperience;
  const skills = [...(role.skills ?? []), ...(overrides.skills ?? [])];
  const operation = overrides.operation ?? "all";
  const topic = overrides.topic;

  const filled = templateLines(operation, topic).replace("{{ROLE}}", role.role).replace("{{YEARS_OF_EXPERIENCE}}", String(years)).replace("{{SKILLS}}", skills.join(", "));

  const lensFallback = topic ? "- the scope above, through this role's expertise" : "- the whole project, through this role's expertise";
  const lenses = (role.lenses ?? []).map((lens) => `- ${lens}`);
  const evidence = (role.evidenceSkills ?? []).map((skill) => `- ${skill}`);

  return [
    filled,
    ...(topic ? scopeSection(topic) : []),
    "",
    ...(topic
      ? [
          "## Lenses, applied to the scope above",
          "",
          "Apply each lens TO the scope, not to the whole project. If a lens does not apply to the scope,",
          'write "not applicable" for it and move on.',
        ]
      : ["## What this role looks at"]),
    "",
    ...(lenses.length > 0 ? lenses : [lensFallback]),
    ...(topic ? resolveScopeSection(overrides.tokensave) : []),
    "",
    "## Evidence to load first",
    "",
    "Load these rule skills before auditing, and treat them as source of truth:",
    "",
    ...(evidence.length > 0 ? evidence : ["- route with `rule` and use what it returns"]),
    ...operationSection(role, operation, topic),
    "",
    "Where a decision belongs to the user, stop and ask instead of guessing.",
    "",
    "Finish by proposing a conventional commit with a mandatory scope for the documents this run wrote,",
    `for example \`docs(${role.id}): ${operation === "all" ? "audit, review and plan" : operation}\`.`,
  ].join("\n");
}
