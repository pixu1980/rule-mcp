/**
 * @module transport/http
 *
 * Streamable HTTP transport for rule-mcp (MCP spec 2025-03-26+, current
 * 2025-06-18 / 2025-11-25). Supersedes the legacy HTTP+SSE transport in
 * transport/sse.js, which is kept only as a back-compat alias.
 *
 * Single MCP endpoint:
 *   POST   /mcp   — client → server JSON-RPC (initialize + requests). Response is
 *                   either a JSON body or an SSE stream, chosen by the SDK transport.
 *   GET    /mcp   — server → client SSE stream for notifications (needs session id).
 *   DELETE /mcp   — terminate a session.
 *   GET    /health — health check (no auth).
 *
 * Session lifecycle is stateful: the SDK generates an Mcp-Session-Id on initialize;
 * subsequent requests must carry it. Each session owns its own MCP Server instance
 * so multiple local clients (Pi, VS Code, …) can share one daemon.
 *
 * Security: bearer token auth (shared with the SSE daemon), cross-origin denial,
 * 1 MB body cap, and the sandbox timeout/error wrapper. Bound to loopback unless
 * RULE_MCP_HOST overrides it.
 *
 * @see module:transport/sse — legacy transport
 * @see module:transport/sse-auth — shared bearer token
 */

import http from "node:http";
import https from "node:https";
import { readFileSync } from "node:fs";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { URL } from "node:url";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../server.js";
import { generateSelfSignedCert } from "./cert.js";
import { wrapRequestHandler, safeJsonParse } from "../utils/sandbox.js";
import { getOrCreateSseBearerToken } from "./sse-auth.js";
import { DEFAULT_SSE_PORT, getSseHost } from "../cli/paths.js";

/** Active MCP transports, keyed by session id. */
const transports = new Map();

/** Active HTTP/HTTPS server instance. */
let httpServer = null;

/** Bearer token for the active local HTTP server. */
let serverToken = null;

/** Maximum POST body size (1 MB). */
const MAX_BODY_BYTES = 1_048_576;

/** Maximum concurrent MCP sessions — bounds memory against session-creation floods. */
const MAX_SESSIONS = 256;

/** Allowed CORS origins (empty = deny all cross-origin). */
const ALLOWED_ORIGINS = new Set();

/**
 * Apply CORS headers based on allowed origins; handle preflight.
 *
 * @returns {boolean} true if the preflight was handled (caller should return)
 */
function handleCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}

/**
 * Constant-time bearer token check. Health check is public.
 *
 * @returns {boolean} true if authorized
 */
function checkAuth(req, pathname) {
  if (pathname === "/health") return true;
  const auth = req.headers.authorization;
  if (!auth) return false;
  const provided = Buffer.from(auth);
  const wanted = Buffer.from(`Bearer ${serverToken}`);
  if (provided.length !== wanted.length) return false;
  return timingSafeEqual(provided, wanted);
}

/** Write a JSON-RPC-style error response. */
function sendJsonRpcError(res, status, code, message) {
  if (res.headersSent) return;
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }));
}

/**
 * Read the full request body, enforcing the size cap.
 *
 * @returns {Promise<string|null>} body text, or null if the cap was exceeded
 *   (a 413 response is sent in that case)
 */
async function readBody(req, res) {
  let bodyLength = 0;
  const buffers = [];
  for await (const chunk of req) {
    bodyLength += chunk.length;
    if (bodyLength > MAX_BODY_BYTES) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Request body too large. Maximum: " + MAX_BODY_BYTES + " bytes." }));
      return null;
    }
    buffers.push(chunk);
  }
  return Buffer.concat(buffers).toString("utf-8");
}

/**
 * HTTP/HTTPS request handler for the Streamable HTTP transport.
 */
async function requestHandler(req, res) {
  if (handleCors(req, res)) return;

  const proto = httpServer instanceof https.Server ? "https" : "http";
  const parsedUrl = new URL(req.url ?? "/", `${proto}://${req.headers.host ?? "localhost"}`);
  const pathname = parsedUrl.pathname;

  // Auth (skipped for /health)
  if (!checkAuth(req, pathname)) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized. Provide Authorization: Bearer <token> header." }));
    return;
  }

  // Cross-origin denial on protected endpoints (DNS-rebinding hardening)
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Cross-origin requests are not allowed." }));
    return;
  }

  try {
    // ── GET /health ──
    if (req.method === "GET" && pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
      return;
    }

    if (pathname !== "/mcp") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    const sessionId = req.headers["mcp-session-id"];
    const existing = typeof sessionId === "string" ? transports.get(sessionId) : undefined;

    // ── POST /mcp ──
    if (req.method === "POST") {
      const body = await readBody(req, res);
      if (body === null) return; // 413 already sent
      const parsed = safeJsonParse(body);
      if (parsed === undefined) {
        sendJsonRpcError(res, 400, -32700, "Parse error: invalid JSON in request body");
        return;
      }

      let transport = existing?.transport;
      if (!transport) {
        // A new session is only allowed on an initialize request with no session id.
        if (sessionId || !isInitializeRequest(parsed)) {
          sendJsonRpcError(res, 400, -32000, "Bad Request: no valid session id for a non-initialize request");
          return;
        }
        if (transports.size >= MAX_SESSIONS) {
          sendJsonRpcError(res, 503, -32000, "Server session limit reached. Close an existing session and retry.");
          return;
        }
        const server = createServer();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            transports.set(sid, { transport, server });
          },
        });
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports.delete(sid)) {
            void server.close().catch(() => {});
          }
        };
        await server.connect(transport);
      }

      await transport.handleRequest(req, res, parsed);
      return;
    }

    // ── GET /mcp (server → client SSE) and DELETE /mcp (terminate) ──
    if (req.method === "GET" || req.method === "DELETE") {
      if (!existing) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No session found for Mcp-Session-Id." }));
        return;
      }
      await existing.transport.handleRequest(req, res);
      return;
    }

    res.writeHead(405, { "Content-Type": "application/json", Allow: "GET, POST, DELETE, OPTIONS" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
  } catch (err) {
    const requestId = randomUUID();
    process.stderr.write(`[rule-mcp] [${requestId}] ${req.method} ${req.url}: ${err?.stack ?? err?.message ?? err}\n`);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error", requestId }));
    }
  }
}

/**
 * Start the Streamable HTTP server.
 *
 * @param {{ port?: number, host?: string, sslCert?: string, sslKey?: string }} [options]
 * @returns {Promise<{ port: number, host: string, token: string }>}
 */
export async function startHttpServer(options = {}) {
  const port = options.port ?? (Number(process.env.RULE_MCP_PORT) || DEFAULT_SSE_PORT);
  const host = options.host ?? getSseHost();
  const { sslCert, sslKey } = options;

  serverToken = getOrCreateSseBearerToken();
  console.error("[rule-mcp] Streamable HTTP authentication enabled");

  if (sslCert && sslKey) {
    try {
      readFileSync(sslCert);
      readFileSync(sslKey);
    } catch {
      const generated = generateSelfSignedCert({ certPath: sslCert, keyPath: sslKey });
      if (!generated) {
        throw new Error(`Failed to generate self-signed cert at ${sslCert}. Provide valid --ssl-cert and --ssl-key.`);
      }
      console.error(`[rule-mcp] Generated self-signed cert: ${sslCert}`);
    }
  }

  const safeHandler = wrapRequestHandler(requestHandler, { timeout: 60000 });

  if (sslCert && sslKey) {
    httpServer = https.createServer({ cert: readFileSync(sslCert), key: readFileSync(sslKey) }, safeHandler);
  } else {
    httpServer = http.createServer(safeHandler);
  }

  // Streams are long-lived; disable the generic idle timeout.
  httpServer.timeout = 0;
  httpServer.keepAliveTimeout = 10000;

  return new Promise((resolve, reject) => {
    httpServer.on("error", reject);
    httpServer.listen(port, host, () => {
      const addr = httpServer.address();
      resolve({ port: addr?.port ?? port, host, token: serverToken });
    });
  });
}

/**
 * Stop the Streamable HTTP server and close all sessions.
 *
 * @returns {Promise<void>}
 */
export async function stopHttpServer() {
  for (const [id, { transport, server }] of transports) {
    try {
      transport.onclose = null;
      await transport.close();
    } catch { /* ignore */ }
    try {
      await server.close();
    } catch { /* ignore */ }
    transports.delete(id);
  }

  if (httpServer) {
    return new Promise((resolve) => {
      httpServer.close(() => {
        httpServer = null;
        resolve();
      });
      setTimeout(() => {
        httpServer?.closeAllConnections?.();
        httpServer = null;
        resolve();
      }, 3000).unref();
    });
  }
}
