/** @module transport/sse/stop */

import { getHttpServer, sessions, setHttpServer } from "./_state.js";

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
  const httpServer = getHttpServer();

  if (httpServer) {
    return new Promise((resolve) => {
      httpServer.close(() => {
        setHttpServer(null);
        resolve();
      });
      setTimeout(() => {
        getHttpServer()?.closeAllConnections?.();
        setHttpServer(null);
        resolve();
      }, 3000).unref();
    });
  }
}
