

/** @module transport/http/stop */

import { getHttpServer, setHttpServer, transports } from "./_state.js";

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
    } catch {
      /* ignore */
    }

    try {
      await server.close();
    } catch {
      /* ignore */
    }

    transports.delete(id);
  }

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
