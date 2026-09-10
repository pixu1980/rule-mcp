// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** @module core/telemetry/recorder/flags */

/**
 * Whether telemetry runs at all.
 * Off with PIX_GALAXY_MCP_NO_TELEMETRY=1.
 *
 * @returns {boolean}
 */
export function telemetryEnabled() {
  return process.env.PIX_GALAXY_MCP_NO_TELEMETRY !== "1";
}

/**
 * Whether the prompt text itself is recorded, or only its length.
 * On by default. Off with PIX_GALAXY_MCP_NO_PROMPTS=1.
 *
 * @returns {boolean}
 */
export function promptsEnabled() {
  return process.env.PIX_GALAXY_MCP_NO_PROMPTS !== "1";
}
