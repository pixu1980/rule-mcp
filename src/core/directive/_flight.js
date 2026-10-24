/**
 * @module core/directive/flight
 *
 * Flight guidance under the process namespace. It is not an MCP prompt and not
 * an agent slash command: SessionStart carries the full form, UserPromptSubmit
 * re-anchors it. Opt out with RULE_MCP_NO_FLIGHT=1 (ADR 114).
 */

/** Conceptual id - process area, never listed on the command surface. */
export const FLIGHT_CONCEPT = "rule-area-process-flight";

/**
 * Whether flight guidance is injected with the session/prompt directive.
 *
 * @returns {boolean}
 */
export function flightEnabled() {
  return process.env.RULE_MCP_NO_FLIGHT !== "1";
}

/**
 * Full flight block for SessionStart (and any surface that needs the steps).
 *
 * @returns {string} the block, or "" when disabled
 */
export function sessionFlight() {
  if (!flightEnabled()) {
    return "";
  }

  return [
    `## PIX FLIGHT (${FLIGHT_CONCEPT})`,
    "",
    "- When costing this server: `rule-mcp telemetry export` (add `--redact` before sharing); `telemetry show <file>` / `telemetry prune`; or `rule_tool_stats`.",
    "- Read the KPI block (savings, reminder overhead, cache hit rate, errors, latency). Propose only what the recorder supports; ask before acting on an ambiguous number.",
  ].join("\n");
}

/**
 * Per-prompt re-anchor fragment (appended to the directive one-liner).
 *
 * @returns {string} short fragment, or "" when disabled
 */
export function promptFlight() {
  if (!flightEnabled()) {
    return "";
  }

  return "flight when costing.";
}
