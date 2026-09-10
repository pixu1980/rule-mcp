// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** The one response shape a tool hands back: a text-only MCP result. */

/** @param {string} text @returns {{ content: Array<{ type: "text", text: string }> }} */
export function textResult(text) {
  return { content: [{ type: "text", text }] };
}

/**
 * The error envelope: isError, one text part, and optional _meta payload.
 *
 * @param {string} text
 * @param {object} [meta]
 * @returns {{ isError: true, content: Array<{ type: "text", text: string }>, _meta?: object }}
 */
export function errorResult(text, meta) {
  return { isError: true, content: [{ type: "text", text }], ...(meta && { _meta: meta }) };
}
