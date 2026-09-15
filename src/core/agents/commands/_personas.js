

/** @module core/agents/commands/personas - persona command targets and bodies */

import { activeRoles } from "../../review/roles/index.js";
import { OPERATIONS } from "../../review/template/index.js";

/**
 * A persona command's target: which role and which operation it runs.
 *
 * @param {string} name
 * @returns {{ role: string, roleName: string, operation: string }|null} null for non-persona commands
 */
export function personaTarget(name) {
  for (const operation of OPERATIONS) {
    const prefix = `rule-${operation}-`;

    if (!name.startsWith(prefix)) {
      continue;
    }

    const roleId = name.slice(prefix.length);
    const role = activeRoles().find((entry) => entry.id === roleId);

    if (role) {
      return { role: role.id, roleName: role.role, operation };
    }
  }

  return null;
}

/**
 * Body for a persona command: it routes through the tools, not a hand-written
 * recap. `rule_tool_plan` hands back the operation contract for this role and
 * operation; `rule_tool_plan_docs` does the trio bookkeeping. Everything else is
 * judgment the agent fills in.
 *
 * @param {{ role: string, roleName: string, operation: string }} target
 * @returns {string}
 */
export function personaBody(target) {
  const subject = `${target.operation} as a ${target.roleName}`;

  return [
    `${subject[0].toUpperCase() + subject.slice(1)}: $ARGUMENTS`,
    "",
    `1. Call \`rule_tool_plan\` with \`role=${target.role}\`, \`operation=${target.operation}\` and the request`,
    "   typed after this command passed through unchanged as `topic` - that text is this run's binding scope.",
    "   With no request after the command, omit topic and the scope is the whole project.",
    "2. Load the evidence skills the contract names and treat them as source of truth; never invent",
    "   APIs, files, dependencies, commands, or requirements not in the evidence.",
    `3. Perform the ${target.operation} the contract describes and gather what it needs - measure rather`,
    "   than assume, and quote commands and their output for every number.",
    `4. Call \`rule_tool_plan_docs\` with \`role=${target.role}\`, the findings and, when a request was given,`,
    "   the same text as `scope` - it writes/refreshes the trio bookkeeping (headers, tables, statuses)",
    "   and leaves findings outside the scope untouched. Fill in the evidence, the finding wording and the steps.",
    "5. If a decision belongs to the user, stop and ask instead of guessing.",
    "6. Responses are compressed automatically by the server: keep it factual and free of filler.",
    "7. Finish by proposing a conventional commit with a mandatory scope for the documents this run",
    `   wrote, e.g. \`docs(${target.role}): ${target.operation}\`.`,
  ].join("\n");
}
