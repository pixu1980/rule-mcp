/** @module transport/sse/state - what one running SSE daemon shares across its routes */

import { SessionRegistry } from "../_session-registry.js";
import { createAuthRateLimiter } from "../_auth-rate-limit.js";

/** Maximum POST body size (1 MB). */
export const MAX_BODY_BYTES = 1_048_576;

/** Maximum concurrent SSE sessions - bounds memory against connection floods. */
export const MAX_SESSIONS = 256;

/** Allowed CORS origins (empty = deny all cross-origin). */
export const ALLOWED_ORIGINS = new Set();

/** Failed-auth rate limiter: 401 below budget, 429 above it. Loopback gets more room. */
export const authLimiter = createAuthRateLimiter({});

/**
 * The sessions an SSE daemon holds, swept by the registry: a client that is
 * killed, a laptop that sleeps, a network that drops mid-stream leave a
 * session whose stream is dead and whose onclose never fires, so the sweep
 * asks each session whether its stream is still there and when it was last
 * used (hardening F-S7).
 */
export const sessions = new Map();

export const registry = new SessionRegistry({ maxSessions: MAX_SESSIONS });

/** Active HTTP/HTTPS server instance. */
let httpServer = null;

/** Bearer token for the active local SSE server. */
let serverToken = null;

export const getHttpServer = () => httpServer;

export const setHttpServer = (server) => {
  httpServer = server;
};

export const getServerToken = () => serverToken;

export const setServerToken = (token) => {
  serverToken = token;
};
