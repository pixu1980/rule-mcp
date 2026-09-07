/** @module transport/http/handler - route dispatch, auth and the error envelope */

import https from "node:https";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import { checkAuth, handleCors } from "./_guards.js";
import { handleMcpPost } from "./_mcp-route.js";
import { ALLOWED_ORIGINS, authLimiter, getHttpServer, transports } from "./_state.js";

/**
 * HTTP/HTTPS request handler for the Streamable HTTP transport.
 */
export async function requestHandler(request, res) {
  if (handleCors(request, res)) {
    return;
  }

  const prototype = getHttpServer() instanceof https.Server ? "https" : "http";
  const parsedUrl = new URL(request.url ?? "/", `${prototype}://${request.headers.host ?? "localhost"}`);
  const pathname = parsedUrl.pathname;

  // Auth (skipped for /health). Failures are rate-limited per remote address
  // (hardening F-S7): only failures consume budget, loopback gets a bigger
  // bucket than the network.
  if (!checkAuth(request, pathname)) {
    const remote = request.socket?.remoteAddress ?? "unknown";
    const verdict = authLimiter.recordFailure(remote);

    res.writeHead(verdict.limited ? 429 : 401, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: verdict.limited ? "Too many failed auth attempts. Wait before retrying." : "Unauthorized. Provide Authorization: Bearer <token> header.",
      }),
    );

    return;
  }

  // Cross-origin denial on protected endpoints (DNS-rebinding hardening)
  const origin = request.headers.origin;

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Cross-origin requests are not allowed." }));

    return;
  }

  try {
    // ── GET /health ──
    if (request.method === "GET" && pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));

      return;
    }

    if (pathname !== "/mcp") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));

      return;
    }

    const sessionId = request.headers["mcp-session-id"];
    const existing = typeof sessionId === "string" ? transports.get(sessionId) : undefined;

    // ── POST /mcp ──
    if (request.method === "POST") {
      await handleMcpPost(request, res, existing, sessionId);

      return;
    }

    // ── GET /mcp (server → client SSE) and DELETE /mcp (terminate) ──
    if (request.method === "GET" || request.method === "DELETE") {
      if (!existing) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No session found for Mcp-Session-Id." }));

        return;
      }

      await existing.transport.handleRequest(request, res);

      return;
    }

    res.writeHead(405, { "Content-Type": "application/json", Allow: "GET, POST, DELETE, OPTIONS" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
  } catch (error) {
    const requestId = randomUUID();

    process.stderr.write(`[rule-mcp] [${requestId}] ${request.method} ${request.url}: ${error?.stack ?? error?.message ?? error}\n`);

    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error", requestId }));
    }
  }
}
