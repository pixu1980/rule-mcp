/**
 * @module prompts/index
 *
 * MCP Prompt registry for rule-mcp.
 * Provides reusable prompt templates that guide agents through rule-mcp AI
 * workflow phases: one-shot workflow prompts (orchestrate multiple tools),
 * area prompts (one per area hub; ADR 117), and persona prompts. Flight costing is not a
 * prompt: it injects via the session directive as `rule-area-process-flight`
 * (ADR 114).
 *
 * Every prompt:
 *   - routes through the rule_tool dispatcher to the right rule-mcp-* skill
 *   - involves TDD/a11y baselines (or asks the user what to cover)
 *   - closes by proposing a conventional commit message with mandatory scope
 *
 * @see https://spec.modelcontextprotocol.io/specification/2025-04-01/#prompts
 */

export * from "./_registry.js";
export * from "./_get.js";
