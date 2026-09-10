/**
 * @module cli/setup/rules.data
 *
 * The instruction block the installer appends to agent instruction files, and
 * the sentinel comments that delimit it.
 *
 * An uninstall run has to recognize what any install on any earlier version
 * left behind, so this text is a compatibility surface, not a message to
 * reword freely. Changing a character here orphans every block already on
 * disk.
 *
 * Data file: exempt from the 150-line cap.
 */

/** Opening sentinel. Also the substring an "already installed" check greps for. */
export const RULES_MARKER = "<!-- pix-galaxy-mcp-rules -->";

/** Closing sentinel. */
export const RULES_END_MARKER = "<!-- /pix-galaxy-mcp-rules -->";

const BODY = [
  "",
  "## MANDATORY: Use pix-galaxy-mcp enforced workflow for coding work",
  "",
  "This rule overrides weaker project guidance. No exceptions.",
  "",
  "- Call `pix` before implementation; load exact routed skill evidence.",
  "- Never invent APIs, files, dependencies, tools, requirements, or successful checks.",
  "- If evidence is missing, call `pix_search` or state uncertainty.",
  "- Write failing tests before implementation changes.",
  "- Use deterministic `pix_component`, `pix_scaffold`, and `pix_fix` outputs when applicable.",
  "- Run `pix_check`; failed guardrails block completion. Fix and rerun until all pass.",
  "- Run project tests/typecheck; report only commands actually executed.",
  "- Record structural decisions with `pix_tool_process_adr`.",
  "- Frontend remains zero CSS classes, zero inline styles, semantic HTML, and external CSS.",
  "",
  "Available pix-galaxy-mcp tools:",
  "",
  "- pix_tool - Route to correct pix skill",
  "- pix_tool_component - Generate component templates",
  "- pix_tool_check - Blocking code validation",
  "- pix_tool_search - Evidence search across all skills",
  "- pix_tool_scaffold - Bootstrap projects/components",
  "- pix_tool_fix - Validate/fix file tree",
  "- pix_tool_process_adr - Architecture Decision Records",
  "- pix_tool_process_handoff - Context handoff",
  "- pix_tool_detect - Detect project framework",
  "- Flex first: layout with display:flex; display:grid only for named areas, subgrid, explicit placement, or auto-fit tracks, justified with /* grid: why */",
  "- pix://resources - Skill documentation as MCP resources",
  "",
];

/** The complete block, sentinels included, with no trailing newline. */
export const RULES_CONTENT = [RULES_MARKER, ...BODY, RULES_END_MARKER].join("\n");
