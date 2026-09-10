

/** @module core/skills/minimal - the reduced tool surface for tool-count-limited clients */

/**
 * Minimal tool surface: expose only the dispatcher + action tools and hide the
 * ~85 per-skill tools (their guidance is reached via pix_gateway / resources).
 *
 * The full 95-tool surface costs tokens on every model turn and exceeds the
 * tool-count limits some clients impose (Cursor, GitHub Copilot), which then
 * silently truncate the list. Off by default; enable with
 * RULE_MCP_MINIMAL_TOOLS=1.
 */
export const IS_MINIMAL_TOOLS = process.env.RULE_MCP_MINIMAL_TOOLS === "1";

/**
 * The exact, fixed tool surface exposed in minimal mode. Enforced as an
 * allowlist AFTER registration (see loadAllSkills), so the set stays small no
 * matter what upstream registration adds.
 */
export const MINIMAL_ALLOWLIST = new Set([
  "pix_tool", // router / dispatcher
  "rule_tool_meta", // meta-framework dispatcher
  "rule_tool_update", // self-update
  "rule_tool_gateway", // route + evidence + guardrails + receipt (single entry)
  "rule_tool_apply", // the only writer
  "rule_tool_search",
  "rule_tool_check",
  "rule_tool_scaffold",
  "rule_tool_detect",
  "rule_tool_process_handoff",
  "rule_tool_component",
]);
/** Whether skills have been loaded yet. */
