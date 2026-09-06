/** @module transport/http/guards */

import { timingSafeEqual } from "node:crypto";
import { ALLOWED_ORIGINS, getServerToken, MAX_BODY_BYTES } from "./_state.js";

/**
 * Apply CORS headers based on allowed origins; handle preflight.
 *
 * @returns {boolean} true if the preflight was handled (caller should return)
 */
export function handleCors(request, res) {
  const origin = request.headers.origin;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  }

  if (request.method === "OPTIONS") {
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
export function checkAuth(request, pathname) {
  if (pathname === "/health") {
    return true;
  }

  const auth = request.headers.authorization;

  if (!auth) {
    return false;
  }

  const provided = Buffer.from(auth);
  const wanted = Buffer.from(`Bearer ${getServerToken()}`);

  if (provided.length !== wanted.length) {
    return false;
  }

  return timingSafeEqual(provided, wanted);
}

/** Write a JSON-RPC-style error response. */
export function sendJsonRpcError(res, status, code, message) {
  if (res.headersSent) {
    return;
  }

  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }));
}

/**
 * Read the full request body, enforcing the size cap.
 *
 * @returns {Promise<string|null>} body text, or null if the cap was exceeded
 *   (a 413 response is sent in that case)
 */
export async function readBody(request, res) {
  let bodyLength = 0;
  const buffers = [];
  for await (const chunk of request) {
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
