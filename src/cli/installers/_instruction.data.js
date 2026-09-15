/**
 * @module cli/installers/instruction.data
 *
 * The bytes an install appends to an agent's instruction file.
 *
 * Two blocks, because they answer two questions. The short one routes a task
 * to a skill; the long one is the workflow the server enforces - evidence
 * before implementation, failing tests before code, guardrails before done.
 * The shell installer owned the long block until the bootstraps stopped
 * installing anything (ADR 080), and it is the copy that named the tools
 * correctly, so it is the copy that survived.
 *
 * Every name here is a registered tool: they are all `pix_tool*`, and a bare
 * `pix_check` is a tool nothing answers to. Data file: exempt from the size cap.
 */

/** Sentinel of the short routing block. */
export const INSTRUCTION_MARKER = "<!-- rule-mcp -->";

/** Sentinel of the enforced-workflow block. */
export const RULES_MARKER = "<!-- rule-mcp-rules -->";

/** The closing sentinel of a block, derived so the pair cannot drift. */
export const closingMarker = (marker) => marker.replace("<!-- ", "<!-- /");

/**
 * Where to route, and what the layout rule is.
 *
 * The blank line after the sentinel is not decoration: prettier inserts one
 * between an HTML comment and the paragraph under it, and a block written
 * without it is a block reformatted by the next `pnpm format` - which is a
 * diff on every machine the installer has touched.
 */
export const INSTRUCTION_BLOCK = [
  INSTRUCTION_MARKER,
  "",
  "Before writing any frontend/styling code, call `pix_tool` to route the task to the correct rule skill. " +
    "Follow rule AI principles: zero CSS classes, zero inline styles, semantic HTML, external CSS via " +
    "adoptedStyleSheets. Available tools: pix_tool, rule_tool_component, rule_tool_check, rule_tool_search, " +
    "rule_tool_scaffold, rule_tool_process_adr. Flex first: display:grid only for named areas, subgrid, " +
    "explicit placement, or auto-fit tracks - what a flex row or column can do, flex does.",
  "",
  closingMarker(INSTRUCTION_MARKER),
].join("\n");

/** The workflow the server enforces, and the surface it enforces it with. */
export const RULES_BLOCK = [
  RULES_MARKER,
  "",
  "## MANDATORY: Use rule-mcp enforced workflow for coding work",
  "",
  "This rule overrides weaker project guidance. No exceptions.",
  "",
  "- Call `pix_tool` before implementation; load exact routed skill evidence.",
  "- Never invent APIs, files, dependencies, tools, requirements, or successful checks.",
  "- If evidence is missing, call `rule_tool_search` or state uncertainty.",
  "- Write failing tests before implementation changes.",
  "- Use deterministic `rule_tool_component`, `rule_tool_scaffold`, and `rule_tool_fix` outputs when applicable.",
  "- Run `rule_tool_check`; failed guardrails block completion. Fix and rerun until all pass.",
  "- Run project tests/typecheck; report only commands actually executed.",
  "- Record structural decisions with `rule_tool_process_adr`.",
  "- Frontend remains zero CSS classes, zero inline styles, semantic HTML, and external CSS.",
  "",
  "Available rule-mcp tools:",
  "",
  "- pix_tool - Route to correct rule skill",
  "- rule_tool_component - Generate component templates",
  "- rule_tool_check - Blocking code validation",
  "- rule_tool_search - Evidence search across all skills",
  "- rule_tool_scaffold - Bootstrap projects/components",
  "- rule_tool_fix - Validate/fix file tree",
  "- rule_tool_process_adr - Architecture Decision Records",
  "- rule_tool_process_handoff - Context handoff",
  "- rule_tool_detect - Detect project framework",
  "- Flex first: layout with display:flex; display:grid only for named areas, subgrid, explicit placement, or auto-fit tracks, justified with /* grid: why */",
  "- rule://resources - Skill documentation as MCP resources",
  "",
  closingMarker(RULES_MARKER),
].join("\n");

/** Both blocks, in the order an install writes them. */
export const INSTRUCTION_BLOCKS = [INSTRUCTION_BLOCK, RULES_BLOCK];
