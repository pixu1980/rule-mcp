/** @module core/skills/minimal - the reduced tool surface for tool-count-limited clients */

/**
 * Minimal tool surface: expose only the dispatcher + action tools and hide the
 * 90 per-skill tools (their guidance is reached via pix_gateway / resources).
 *
 * The full 107-tool surface costs tokens on every model turn and exceeds the
 * tool-count limits some clients impose (Cursor, GitHub Copilot), which then
 * silently truncate the list. Off by default; enable with
 * PIX_GALAXY_MCP_MINIMAL_TOOLS=1, or pick a narrower surface with
 * PIX_GALAXY_MCP_SURFACE (see core/skills/_surface.js).
 */
export const IS_MINIMAL_TOOLS = process.env.PIX_GALAXY_MCP_MINIMAL_TOOLS === "1";

/**
 * The exact, fixed tool surface exposed in minimal mode. Enforced as an
 * allowlist AFTER registration (see loadAllSkills), so the set stays small no
 * matter what upstream registration adds.
 */
export const MINIMAL_ALLOWLIST = new Set([
  "pix_tool", // router / dispatcher
  "pix_tool_update", // self-update
  "pix_tool_gateway", // route + evidence + guardrails + receipt (single entry)
  "pix_tool_apply", // the only writer
  "pix_tool_search",
  "pix_tool_check",
  "pix_tool_scaffold",
  "pix_tool_detect",
  "pix_tool_process_handoff",
  "pix_tool_component",
]);
/** Whether skills have been loaded yet. */
