

/** The prompt registry: static definitions plus generated persona prompts. */
import { activeRoles } from "../core/review/roles/index.js";
import { OPERATIONS } from "../core/review/template/index.js";
import { PROMPT_DEFS } from "./_defs.data.js";

/**
 * List all available prompts with their descriptions and argument schemas.
 *
 * @returns {Array<{ name: string, description: string, arguments: Array<{ name: string, description: string, required?: boolean }> }>}
 */
export function listPrompts() {
  return [...PROMPT_DEFS, ...rolePrompts()].sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * One prompt per active review persona per operation, generated from the
 * registry: `rule-plan-<role>`, `rule-audit-<role>`, `rule-review-<role>` - 54
 * persona commands for the 18 active roles.
 *
 * The names are shared with the agent commands on purpose: the command
 * generator derives its set from this registry, so a second name for the same
 * operation would be the drift ADR 028 removed.
 *
 * @returns {Array<{ name: string, description: string, arguments: object[] }>}
 */
function rolePrompts() {
  const verb = { plan: "Plan", audit: "Audit", review: "Review" };

  return activeRoles().flatMap((role) =>
    OPERATIONS.map((operation) => ({
      name: `rule-${operation}-${role.id}`,
      description: `${verb[operation]} as a ${role.role} with ${role.yearsOfExperience} years of experience`,
      arguments: [
        {
          name: "topic",
          description: "Extra request for this run (free text: what to audit/review/plan, e.g. a component, a directory, a concern). Default: the whole project.",
          required: false,
        },
      ],
    })),
  );
}

/**
 * Whether MCP prompts are currently suppressed.
 *
 * Claude Code exposes MCP prompts as `/<server>:<prompt> (MCP)` and offers no
 * client-side way to hide them. The installer ships clean `/rule-*` user
 * commands for Claude and sets this flag so the prefixed prompt duplicates are
 * not also listed. `listPrompts()` itself stays pure (the full registry) - only
 * `listActivePrompts()` honors the flag.
 *
 * @returns {boolean}
 */
export function promptsSuppressed() {
  return process.env.RULE_MCP_NO_PROMPTS === "1";
}

/**
 * The prompts the server should advertise: the full registry, or an empty list
 * when suppression is active.
 *
 * @returns {ReturnType<typeof listPrompts>}
 */
export function listActivePrompts() {
  return promptsSuppressed() ? [] : listPrompts();
}
