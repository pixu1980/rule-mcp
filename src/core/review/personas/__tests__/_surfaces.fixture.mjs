

/**
 * Personas plan B.1-B.3: the surfaces, all generated from the registry.
 *
 * One role, one prompt, one agent command, and one composable tool. The names
 * come from the registry, so activating or deprecating a role changes every
 * entry point at once - that is the whole reason the registry exists.
 *
 * Naming note: the prompt and the agent command share the name
 * `rule-persona-<role>` (ADR 120). The agent-command generator derives its set
 * from the prompt registry, so two names for one role would be exactly the
 * drift ADR 028 removed.
 */

export { activeRoles } from "../../roles/index.js";
export { OPERATIONS } from "../../template/index.js";
export { getPrompt, listPrompts } from "../../../../prompts/index.js";
export { listAgentCommands } from "../../../agents/commands/index.js";
export { callTool, listTools } from "../../../../tools/router/index.js";

const { registerPlanTool } = await import("../../../../tools/actions/_plan.js");

registerPlanTool();
