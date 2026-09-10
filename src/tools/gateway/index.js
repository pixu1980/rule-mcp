

/**
 * @module tools/gateway
 *
 * rule_tool_gateway - single-entry orchestrator: routing, evidence loading and
 * guardrail checking in one atomic server-side operation, with signed receipts
 * that bind what was checked to what may be written.
 */

export * from "./_core.js";
export * from "./_receipts.js";
export * from "./_validate.js";
export * from "./_register.js";
