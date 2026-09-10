

/** @module transport/sse/sse-route - GET /sse: open one stream, one server instance */

import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "../../server/index.js";
import { MAX_SESSIONS, registry, sessions } from "./_state.js";

/**
 * Establish an SSE stream for one client.
 *
 * @param {import("node:http").ServerResponse} res
 */
export async function handleSseOpen(res) {
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
}
