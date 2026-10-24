/** @module core/agents/commands/personas - persona command target and body */

import { PLAN_INTENT_KEYWORDS_LIST, REVIEW_INTENT_KEYWORDS_LIST, activeRoles, parsePersonaCommand } from "../../review/roles/index.js";

/**
 * A persona command's target: which role it runs. The operation is no longer
 * part of the name; the request decides it (ADR 120).
 *
 * @param {string} name
 * @returns {{ role: string, roleName: string }|null} null for non-persona commands
 */
export function personaTarget(name) {
  const parsed = parsePersonaCommand(name);

  if (!parsed) {
    return null;
  }

  const role = activeRoles().find((entry) => entry.id === parsed.roleId);

  if (role) {
    return { role: role.id, roleName: role.role };
  }

  return null;
}

/**
 * Body for a persona command: it routes through the tools, not a hand-written
 * recap. The depth of the run is read from `$ARGUMENTS` with the same whole-token
 * intent the prompt resolver uses (ADR 120): a plan ask runs the audit, the
 * review and the plan; a review ask runs the audit and the review; anything
 * else runs the audit alone. `rule_tool_plan` hands back the operation contract;
 * `rule_tool_impersonation` does the trio bookkeeping.
 *
 * @param {{ role: string, roleName: string }} target
 * @returns {string}
 */
export function personaBody(target) {
  return [
    `Audit, review and plan as a ${target.roleName}: $ARGUMENTS`,
    "",
    "Depth intent: decide the operation from $ARGUMENTS before doing anything else, matching whole tokens",
    "case-insensitively.",
    `- A request that names a plan (${PLAN_INTENT_KEYWORDS_LIST}) runs \`operation=plan\`: audit, then review, then plan.`,
    `- Otherwise, a request that names a review (${REVIEW_INTENT_KEYWORDS_LIST}) runs \`operation=review\`: audit, then review.`,
    "- Otherwise, run `operation=audit`: the audit only.",
    "",
    `1. Call \`rule_tool_plan\` with \`role=${target.role}\`, the \`operation\` you just decided and the request`,
    "   typed after this command passed through unchanged as `topic` - that text is this run's binding scope.",
    "   With no request after the command, omit topic and the scope is the whole project.",
    "2. Load the evidence skills the contract names and treat them as source of truth; never invent",
    "   APIs, files, dependencies, commands, or requirements not in the evidence.",
    "3. Perform the operation the contract describes and gather what it needs - measure rather",
    "   than assume, and quote commands and their output for every number.",
    `4. Call \`rule_tool_impersonation\` with \`role=${target.role}\`, the findings and, when a request was given,`,
    "   the same text as `scope` - it writes/refreshes the trio bookkeeping (headers, tables, statuses)",
    "   and leaves findings outside the scope untouched. Fill in the evidence, the finding wording and the steps.",
    "5. If a decision belongs to the user, stop and ask instead of guessing.",
    "6. Responses are compressed automatically by the server: keep it factual and free of filler.",
    "7. Finish by proposing a conventional commit with a mandatory scope for the documents this run",
    `   wrote, e.g. \`docs(${target.role}): audit\`.`,
  ].join("\n");
}
