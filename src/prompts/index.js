

/**
 * @module prompts/index
 *
 * MCP Prompt registry for rule-mcp.
 * Provides reusable prompt templates that guide agents through rule AI
 * workflow phases: 5 one-shot workflow prompts (orchestrate multiple tools),
 * 15 area prompts (one per tool area).
 *
 * Every prompt:
 *   - routes through the pix_tool dispatcher to the right rule-* skill
 *   - involves TDD/a11y baselines (or asks the user what to cover)
 *   - closes by proposing a conventional commit message with mandatory scope
 *
 * @see https://spec.modelcontextprotocol.io/specification/2025-04-01/#prompts
 */

export * from "./_registry.js";
export * from "./_get.js";
