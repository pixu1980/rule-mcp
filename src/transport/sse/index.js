// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/**
 * @module transport/sse
 *
 * SSE (Server-Sent Events) transport for rule-mcp.
 * Provides an HTTP/HTTPS server with:
 *   - GET /sse    - SSE stream for MCP protocol
 *   - POST /message - MCP message handler
 *   - GET /health - Health check (no auth required)
 *
 * Uses the SDK's SSEServerTransport for MCP protocol compliance.
 * Supports optional HTTPS with --ssl-cert / --ssl-key flags.
 *
 * Security: bearer token auth on /sse and /message endpoints.
 * The local daemon uses one persisted owner-only token across restarts.
 *
 * @see module:server - createServer is imported here
 */

export * from "./_start.js";
export * from "./_stop.js";
