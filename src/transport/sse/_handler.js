/** @module transport/sse/handler - route dispatch, auth and the error envelope */

import https from "node:https";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import { checkAuth, handleCors } from "./_guards.js";
import { handleMessagePost } from "./_message-route.js";
import { handleSseOpen } from "./_sse-route.js";
import { ALLOWED_ORIGINS, authLimiter, getHttpServer } from "./_state.js";

/**
 * HTTP/HTTPS request handler.
 */
export async function requestHandler(request, res) {
  if (handleCors(request, res)) {
    return;
  }

  const prototype = getHttpServer() instanceof https.Server ? "https" : "http";
  const parsedUrl = new URL(request.url ?? "/", `${prototype}://${request.headers.host ?? "localhost"}`);
  const pathname = parsedUrl.pathname;

  // Auth check (skipped for /health). Failures are rate-limited per remote
  // address: only failures consume budget, loopback gets a larger bucket.
  if (!checkAuth(request, pathname)) {
    const remote = request.socket?.remoteAddress ?? "unknown";
    const verdict = authLimiter.recordFailure(remote);

    res.writeHead(verdict.limited ? 429 : 401, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: verdict.limited
          ? "Too many failed auth attempts. Wait before retrying."
          : "Unauthorized. Provide Authorization: Bearer <token> header.",
      }),
    );

    return;
  }

  // Block cross-origin requests on protected endpoints
  const origin = request.headers.origin;

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Cross-origin requests are not allowed." }));

    return;
  }

  try {
    // ── GET /health ──────────────────────────────────────────
    if (request.method === "GET" && parsedUrl.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));

      return;
    }

    // ── GET /sse - Establish SSE stream ──────────────────────
    if (request.method === "GET" && parsedUrl.pathname === "/sse") {
      await handleSseOpen(res);

      return;
    }

    // ── POST /message - Handle MCP request ───────────────────
    if (request.method === "POST" && parsedUrl.pathname.startsWith("/message")) {
      await handleMessagePost(request, res, parsedUrl);

      return;
    }

    // ── 404 ──────────────────────────────────────────────────
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (error) {
    // Log full detail server-side; return only a generic message + correlation id
    // to the client to avoid leaking internal state.
    const requestId = randomUUID();
    process.stderr.write(
      `[rule-mcp] [${requestId}] ${request.method} ${request.url}: ${error?.stack ?? error?.message ?? error}\n`,
    );

    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error", requestId }));
    }
  }
}
