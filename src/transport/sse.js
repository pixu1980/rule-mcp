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

import http from "node:http";
import https from "node:https";
import { readFileSync } from "node:fs";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { URL } from "node:url";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "../server.js";
import { generateSelfSignedCert } from "./cert.js";
import { wrapRequestHandler, safeJsonParse } from "../utils/sandbox.js";
import { getOrCreateSseBearerToken } from "./sse-auth.js";

import { SessionRegistry } from "./session-registry.js";
import { createAuthRateLimiter } from "./auth-rate-limit.js";

/**
 * The sessions an SSE daemon holds, swept by the registry: a client that is
 * killed, a laptop that sleeps, a network that drops mid-stream leave a
 * session whose stream is dead and whose onclose never fires, so the sweep
 * asks each session whether its stream is still there and when it was last
 * used (hardening F-S7).
 */
/** Active HTTP/HTTPS server instance. */
let httpServer = null;

/** Bearer token for the active local SSE server. */
let serverToken = null;

/** Maximum POST body size (1 MB). */
const MAX_BODY_BYTES = 1_048_576;

/** Failed-auth rate limiter: 401 below budget, 429 above it. Loopback gets more room. */
const authLimiter = createAuthRateLimiter({});

/** Maximum concurrent SSE sessions - bounds memory against connection floods. */
const MAX_SESSIONS = 256;

/**
 * Idle sweep over the sessions: a client that is killed, a laptop that
 * sleeps, a network that drops mid-stream leave a session whose stream is
 * dead, so closing is driven by the transport's own callback AND by a sweep
 * that evicts sessions nobody touched for the idle ceiling (hardening F-S7).
 */
const sessions = new Map();

const registry = new SessionRegistry({ maxSessions: MAX_SESSIONS });

/** Allowed CORS origins (empty = deny all cross-origin). */
const ALLOWED_ORIGINS = new Set();

/**
 * Apply CORS headers based on allowed origins.
 * Denies cross-origin requests by default.
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @returns {boolean} - true if preflight was handled (caller should return)
 */
function handleCors(req, res) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();

    return true;
  }

  return false;
}

/**
 * Validate bearer token on protected endpoints.
 * Skips health check.
 *
 * @param {http.IncomingMessage} req
 * @param {string} pathname
 * @returns {boolean} - true if authorized
 */
function checkAuth(req, pathname) {
  // Health check is public
  if (pathname === "/health") {
    return true;
  }
  // SSE and message endpoints require bearer token
  const auth = req.headers.authorization;

  if (!auth) {
    return false;
  }

  const expected = `Bearer ${serverToken}`;
  const provided = Buffer.from(auth);
  const wanted = Buffer.from(expected);
  // Length guard first - timingSafeEqual throws on unequal-length buffers.
  // The length of the expected token is not secret.
  if (provided.length !== wanted.length) {
    return false;
  }

  return timingSafeEqual(provided, wanted);
}

/**
 * HTTP/HTTPS request handler.
 */
async function requestHandler(request, res) {
  if (handleCors(request, res)) {
    return;
  }

  const prototype = httpServer instanceof https.Server ? "https" : "http";
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
      if (registry.atCapacity() || registry.size >= MAX_SESSIONS) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Server session limit reached. Close an existing session and retry." }));

        return;
      }
      // Each connection owns a server instance. This lets Pi, VS Code, and
      // other local clients share one daemon without evicting each other.
      const transport = new SSEServerTransport("/message", res);
      const server = createServer();
      const session = { transport, server };
      sessions.set(transport.sessionId, session);
      registry.add(transport.sessionId, {
        close: () => {
          if (sessions.delete(transport.sessionId)) {
            void server.close().catch(() => {});
          }
        },
      });

      const closeSession = () => {
        if (!sessions.delete(transport.sessionId)) {
          return;
        }
        void server.close().catch(() => {});
      };
      transport.onclose = closeSession;
      transport.onerror = closeSession;

      try {
        await server.connect(transport);
      } catch (error) {
        sessions.delete(transport.sessionId);
        await server.close().catch(() => {});
        throw error;
      }

      return;
    }

    // ── POST /message - Handle MCP request ───────────────────
    if (request.method === "POST" && parsedUrl.pathname.startsWith("/message")) {
      // Body size limit (1 MB)
      let bodyLength = 0;
      const buffers = [];
      const maxBytes = MAX_BODY_BYTES;
      for await (const chunk of request) {
        bodyLength += chunk.length;

        if (bodyLength > maxBytes) {
          res.writeHead(413, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Request body too large. Maximum: " + maxBytes + " bytes." }));

          return;
        }

        buffers.push(chunk);
      }

      const body = Buffer.concat(buffers).toString("utf-8");

      // A live message marks the session in use: the sweep only evicts what
      // has been idle past the ceiling.
      const messagePathMatch = parsedUrl.pathname.match(/\/message\/([^/?#]+)/);

      if (messagePathMatch) {
        registry.touch(messagePathMatch[1]);
      }

      const sessionId = parsedUrl.searchParams.get("sessionId") ?? "";
      const session = sessions.get(sessionId);
      const transport = session?.transport;

      if (!transport) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No SSE session found for sessionId: " + sessionId }));

        return;
      }

      // Safe JSON parse with error handling
      const parsed = safeJsonParse(body);

      if (!parsed) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON in request body" }));

        return;
      }

      let logged = false;
      const originalEnd = res.end.bind(res);
      res.end = (...args) => {
        if (!logged) {
          logged = true;
          console.error("[sse-debug] POST /message status:", res.statusCode);
        }

        return originalEnd(...args);
      };
      await transport.handlePostMessage(request, res, parsed);

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

/**
 * Start the SSE HTTP/HTTPS server.
 * Creates an MCP Server via createServer() and listens on the given port.
 * Supports HTTPS via sslCert/sslKey options.
 *
 * @param {{
 *   port?: number,
 *   sslCert?: string,
 *   sslKey?: string
 * }} [options] - Port and optional TLS cert paths
 * @returns {Promise<{ port: number, token: string }>}
 */
export async function startSseServer(options = {}) {
  registry.startSweeper();
  const { DEFAULT_SSE_PORT, getSseHost } = await import("../cli/paths.js");
  const port = options.port ?? (Number(process.env.RULE_MCP_PORT) || DEFAULT_SSE_PORT);
  const host = options.host ?? getSseHost();
  const { sslCert, sslKey } = options;

  // Persisted token keeps daemon client configuration valid after restarts.
  serverToken = getOrCreateSseBearerToken();
  console.error("[rule-mcp] SSE authentication enabled");

  // Handle SSL: resolve cert files, auto-generate if missing
  let resolvedCert = sslCert;
  let resolvedKey = sslKey;

  if (sslCert && sslKey) {
    try {
      readFileSync(resolvedCert);
      readFileSync(resolvedKey);
    } catch {
      const generated = generateSelfSignedCert({ certPath: resolvedCert, keyPath: resolvedKey });

      if (!generated) {
        throw new Error(
          `Failed to generate self-signed cert at ${resolvedCert}. Provide valid --ssl-cert and --ssl-key.`,
        );
      }

      console.error(`[rule-mcp] Generated self-signed cert: ${resolvedCert}`);
    }
  }

  // Wrap the request handler with sandbox (timeout + error recovery)
  const safeHandler = wrapRequestHandler(requestHandler, { timeout: 60_000 });

  // Create HTTP or HTTPS server
  httpServer =
    sslCert && sslKey
      ? https.createServer(
          {
            cert: readFileSync(resolvedCert),
            key: readFileSync(resolvedKey),
          },
          safeHandler,
        )
      : http.createServer(safeHandler);

  // SSE streams are intentionally long-lived; generic idle timeouts reconnect clients.
  httpServer.timeout = 0;
  httpServer.keepAliveTimeout = 10_000;

  // Start listening
  return new Promise((resolve, reject) => {
    httpServer.on("error", reject);
    httpServer.listen(port, host, () => {
      const addr = httpServer.address();

      resolve({ port: addr?.port ?? port, host, token: serverToken });
    });
  });
}

/**
 * Stop the SSE HTTP/HTTPS server gracefully.
 * Closes all active SSE transports and the server.
 *
 * @returns {Promise<void>}
 */
export async function stopSseServer() {
  // Close all active transports and their independent MCP server instances.
  for (const [id, { transport, server }] of sessions) {
    try {
      transport.onclose = null;
      await transport.close();
    } catch {
      /* ignore */
    }

    try {
      await server.close();
    } catch {
      /* ignore */
    }

    sessions.delete(id);
  }

  // Close HTTP server
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
