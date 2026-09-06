/** @module transport/sse/guards */

import { timingSafeEqual } from "node:crypto";
import { ALLOWED_ORIGINS, getServerToken } from "./_state.js";

/**
 * Apply CORS headers based on allowed origins.
 * Denies cross-origin requests by default.
 *
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @returns {boolean} - true if preflight was handled (caller should return)
 */
export function handleCors(req, res) {
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
 * @param {import("node:http").IncomingMessage} req
 * @param {string} pathname
 * @returns {boolean} - true if authorized
 */
export function checkAuth(req, pathname) {
  // Health check is public
  if (pathname === "/health") {
    return true;
  }
  // SSE and message endpoints require bearer token
  const auth = req.headers.authorization;

  if (!auth) {
    return false;
  }

  const expected = `Bearer ${getServerToken()}`;
  const provided = Buffer.from(auth);
  const wanted = Buffer.from(expected);
  // Length guard first - timingSafeEqual throws on unequal-length buffers.
  // The length of the expected token is not secret.
  if (provided.length !== wanted.length) {
    return false;
  }

  return timingSafeEqual(provided, wanted);
}
