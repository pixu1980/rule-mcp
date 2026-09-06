/**
 * rule-mcp Guardrails Engine
 *
 * Public API for guardrails: getGuardrails, checkCode, getGuardrailsReport.
 * Guardrail definitions live in the sibling catalog modules (imported below,
 * per module rather than through the barrel: the barrel re-exports this
 * engine, so importing it back would be a cycle).
 *
 * The agent iterates: generate → check → fix → re-check → until all pass.
 */

export * from "./_registry.js";
export * from "./_check.js";
export * from "./_report.js";
