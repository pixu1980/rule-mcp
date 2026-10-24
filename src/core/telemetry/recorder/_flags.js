/** @module core/telemetry/recorder/flags */

/**
 * Whether telemetry runs at all.
 * Off with RULE_MCP_NO_TELEMETRY=1.
 *
 * @returns {boolean}
 */
export function telemetryEnabled() {
  return process.env.RULE_MCP_NO_TELEMETRY !== "1";
}

/**
 * Whether the prompt text itself is recorded, or only its length.
 * On by default. Off with RULE_MCP_NO_PROMPTS=1.
 *
 * @returns {boolean}
 */
export function promptsEnabled() {
  return process.env.RULE_MCP_NO_PROMPTS !== "1";
}
