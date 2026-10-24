

/** The prompt registry: static definitions plus generated persona prompts. */
import { activeRoles, personaCommandName } from "../core/review/roles/index.js";
import { PROMPT_DEFS } from "./_defs.data.js";
import { listAreaPrompts } from "./_areas.js";

/**
 * List all available prompts with their descriptions and argument schemas.
 *
 * @returns {Array<{ name: string, description: string, arguments: Array<{ name: string, description: string, required?: boolean }> }>}
 */
export function listPrompts() {
  // The area prompts are one per area hub (ADR 117); leaf skills keep tools only.
  const areas = listAreaPrompts().map(({ name, description, arguments: args }) => ({ name, description, arguments: args }));

  return [...PROMPT_DEFS, ...areas, ...rolePrompts()].sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * One prompt per active review persona: `rule-mcp-persona-<role>` - 19 persona
 * commands for the 19 active roles (ADR 120). The depth of the run (audit,
 * audit+review, audit+review+plan) is read from the request, not from the
 * command name; see `core/review/roles/operation-intent`.
 *
 * The names are shared with the agent commands on purpose: the command
 * generator derives its set from this registry, so a second name for the same
 * role would be the drift ADR 028 removed.
 *
 * @returns {Array<{ name: string, description: string, arguments: object[] }>}
 */
function rolePrompts() {
  return activeRoles().map((role) => ({
    name: personaCommandName(role.id),
    description: `Audit, review and plan as a ${role.role} with ${role.yearsOfExperience} years of experience - the request decides how deep the run goes`,
    arguments: [
      {
        name: "topic",
        description:
          "Free-text request for this run (what to look at, e.g. a component, a directory, a concern). Naming a review or a plan in it raises the run to audit+review or audit+review+plan; default: audit only, over the whole project.",
        required: false,
      },
    ],
  }));
}

/**
 * Whether MCP prompts are currently suppressed.
 *
 * Claude Code exposes MCP prompts as `/<server>:<prompt> (MCP)` and offers no
 * client-side way to hide them. The installer ships clean `/rule-mcp-*` user
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
