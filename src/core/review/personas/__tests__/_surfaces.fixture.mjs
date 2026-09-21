

/**
 * Personas plan B.1-B.3: the surfaces, all generated from the registry.
 *
 * One role, three prompts, three agent commands, and one composable tool. The
 * names come from the registry, so activating or deprecating a role changes
 * every entry point at once - that is the whole reason the registry exists.
 *
 * Naming note: the prompts and the agent commands share the names
 * `rule-plan-<role>`, `rule-audit-<role>`, `rule-review-<role>`. The agent-command
 * generator derives its set from the prompt registry, so two names for one
 * operation would be exactly the drift ADR 028 removed.
 */

export { activeRoles } from "../../roles/index.js";
export { OPERATIONS } from "../../template/index.js";
export { getPrompt, listPrompts } from "../../../../prompts/index.js";
export { listAgentCommands } from "../../../agents/commands/index.js";
export { callTool, listTools } from "../../../../tools/router/index.js";

const { registerPlanTool } = await import("../../../../tools/actions/_plan.js");

registerPlanTool();
