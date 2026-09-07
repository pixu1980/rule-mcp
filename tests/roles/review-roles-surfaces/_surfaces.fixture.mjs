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
 * operation would be exactly the drift ADR 029 removed.
 */

export { activeRoles } from "../../../src/core/review/roles/index.js";
export { OPERATIONS } from "../../../src/core/review/template/index.js";
export { getPrompt, listPrompts } from "../../../src/prompts/index.js";
export { listAgentCommands } from "../../../src/core/agents/commands/index.js";
export { callTool, listTools } from "../../../src/tools/router/index.js";

const { registerPlanTool } = await import("../../../src/tools/plan.js");

registerPlanTool();
