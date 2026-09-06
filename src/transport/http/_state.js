/** @module transport/http/state - what one running Streamable HTTP daemon shares */

import { createAuthRateLimiter } from "../_auth-rate-limit.js";

/** Active MCP transports, keyed by session id. */
export const transports = new Map();

/** Maximum POST body size (1 MB). */
export const MAX_BODY_BYTES = 1_048_576;

/** Maximum concurrent MCP sessions - bounds memory against session-creation floods. */
export const MAX_SESSIONS = 256;

/** Allowed CORS origins (empty = deny all cross-origin). */
export const ALLOWED_ORIGINS = new Set();

/** Failed-auth rate limiter: 401 below budget, 429 above it (hardening F-S7). */
export const authLimiter = createAuthRateLimiter({});

/** Active HTTP/HTTPS server instance. */
let httpServer = null;

/** Bearer token for the active local HTTP server. */
let serverToken = null;

export const getHttpServer = () => httpServer;

export const setHttpServer = (server) => {
  httpServer = server;
};

export const getServerToken = () => serverToken;

export const setServerToken = (token) => {
  serverToken = token;
};
