/**
 * @module transport/http
 *
 * Streamable HTTP transport for rule-mcp (MCP spec 2025-03-26+, current
 * 2025-06-18 / 2025-11-25). Supersedes the HTTP+SSE transport in
 * transport/sse/, which is kept only as a back-compat alias.
 *
 * Single MCP endpoint:
 *   POST   /mcp   - client → server JSON-RPC (initialize + requests). Response is
 *                   either a JSON body or an SSE stream, chosen by the SDK transport.
 *   GET    /mcp   - server → client SSE stream for notifications (needs session id).
 *   DELETE /mcp   - terminate a session.
 *   GET    /health - health check (no auth).
 *
 * Session lifecycle is stateful: the SDK generates an Mcp-Session-Id on initialize;
 * subsequent requests must carry it. Each session owns its own MCP Server instance
 * so multiple local clients (Pi, VS Code, ...) can share one daemon.
 *
 * Security: bearer token auth (shared with the SSE daemon), cross-origin denial,
 * 1 MB body cap, and the sandbox timeout/error wrapper. Bound to loopback unless
 * RULE_MCP_HOST overrides it.
 *
 * @see module:transport/sse - alternate transport
 * @see module:transport/sse-auth - shared bearer token
 */

export { startHttpServer } from "./_start.js";
export { stopHttpServer } from "./_stop.js";
