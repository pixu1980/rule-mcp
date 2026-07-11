/**
 * @module transport/sse
 *
 * SSE (Server-Sent Events) transport for pix-galaxy-mcp.
 * Provides an HTTP/HTTPS server with:
 *   - GET /sse    — SSE stream for MCP protocol
 *   - POST /message — MCP message handler
 *   - GET /health — Health check
 *
 * Uses the SDK's SSEServerTransport for MCP protocol compliance.
 * Supports optional HTTPS with --ssl-cert / --ssl-key flags.
 *
 * @see module:server — createServer is imported here
 */

import http from "node:http";
import https from "node:https";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "../server.js";
import { generateSelfSignedCert } from "./cert.js";
import { wrapRequestHandler, safeJsonParse, withTimeout } from "../utils/sandbox.js";

/** Active SSE transports, keyed by sessionId. */
const transports = new Map();

/** Active HTTP/HTTPS server instance. */
let httpServer = null;

/** Active MCP Server instance. */
let mcpServer = null;

/**
 * CORS headers applied to all responses.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Apply CORS headers and handle preflight.
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @returns {boolean} — true if preflight was handled (caller should return)
 */
function handleCors(req, res) {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value);
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}

/**
 * HTTP/HTTPS request handler.
 */
async function requestHandler(req, res) {
  if (handleCors(req, res)) return;

  const proto = httpServer instanceof https.Server ? "https" : "http";
  const parsedUrl = new URL(req.url ?? "/", `${proto}://${req.headers.host ?? "localhost"}`);

  try {
    // ── GET /health ──────────────────────────────────────────
    if (req.method === "GET" && parsedUrl.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
      return;
    }

    // ── GET /sse — Establish SSE stream ──────────────────────
    if (req.method === "GET" && parsedUrl.pathname === "/sse") {
      // Close any existing transport before creating a new one
      // (single-client model — daemon mode typically has one IDE client)
      for (const [id, existingTransport] of transports) {
        try { await existingTransport.close(); } catch { /* ignore */ }
        transports.delete(id);
      }

      const transport = new SSEServerTransport("/message", res);
      transports.set(transport.sessionId, transport);

      transport.onclose = () => { transports.delete(transport.sessionId); };
      transport.onerror = () => { transports.delete(transport.sessionId); };

      await mcpServer.connect(transport);
      return;
    }

    // ── POST /message — Handle MCP request ───────────────────
    if (req.method === "POST" && parsedUrl.pathname.startsWith("/message")) {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const body = Buffer.concat(buffers).toString("utf-8");

      const sessionId = parsedUrl.searchParams.get("sessionId") ?? "";
      const transport = transports.get(sessionId);

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

      await transport.handlePostMessage(req, res, parsed);
      return;
    }

    // ── 404 ──────────────────────────────────────────────────
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));

  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
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
 * }} [options] — Port and optional TLS cert paths
 * @returns {Promise<{ port: number }>}
 */
export async function startSseServer(options = {}) {
  const port = options.port ?? 37999;
  const { sslCert, sslKey } = options;

  mcpServer = createServer();

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
        throw new Error(`Failed to generate self-signed cert at ${resolvedCert}. Provide valid --ssl-cert and --ssl-key.`);
      }
      console.error(`[pix-galaxy-mcp] Generated self-signed cert: ${resolvedCert}`);
    }
  }

  // Wrap the request handler with sandbox (timeout + error recovery)
  const safeHandler = wrapRequestHandler(requestHandler, { timeout: 60000 });

  // Create HTTP or HTTPS server
  if (sslCert && sslKey) {
    httpServer = https.createServer({
      cert: readFileSync(resolvedCert),
      key: readFileSync(resolvedKey),
    }, safeHandler);
  } else {
    httpServer = http.createServer(safeHandler);
  }

  // Set server timeout to auto-close idle connections
  httpServer.timeout = 60000;
  httpServer.keepAliveTimeout = 10000;

  // Start listening
  return new Promise((resolve, reject) => {
    httpServer.on("error", reject);
    httpServer.listen(port, "127.0.0.1", () => {
      const addr = httpServer.address();
      resolve({ port: addr?.port ?? port });
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
  // Close all active transports
  for (const [id, transport] of transports) {
    try {
      transport.onclose = null;
      await transport.close();
    } catch { /* ignore */ }
    transports.delete(id);
  }

  // Close MCP server
  if (mcpServer) {
    try { await mcpServer.close(); } catch { /* ignore */ }
    mcpServer = null;
  }

  // Close HTTP server
  if (httpServer) {
    return new Promise((resolve) => {
      httpServer.close(() => { httpServer = null; resolve(); });
      setTimeout(() => {
        httpServer?.closeAllConnections?.();
        httpServer = null;
        resolve();
      }, 3000).unref();
    });
  }
}
