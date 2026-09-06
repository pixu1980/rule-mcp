/** @module transport/sse/start */

import http from "node:http";
import https from "node:https";
import { readFileSync } from "node:fs";
import { generateSelfSignedCert } from "../_cert.js";
import { wrapRequestHandler } from "../../utils/index.js";
import { getOrCreateSseBearerToken } from "../_sse-auth.js";
import { requestHandler } from "./_handler.js";
import { registry, setHttpServer, setServerToken } from "./_state.js";

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
  const { DEFAULT_SSE_PORT, getSseHost } = await import("../../cli/paths.js");
  const port = options.port ?? (Number(process.env.RULE_MCP_PORT) || DEFAULT_SSE_PORT);
  const host = options.host ?? getSseHost();
  const { sslCert, sslKey } = options;

  // Persisted token keeps daemon client configuration valid after restarts.
  const serverToken = getOrCreateSseBearerToken();
  setServerToken(serverToken);
  console.error("[rule-mcp] SSE authentication enabled");

  // Handle SSL: resolve cert files, auto-generate if missing
  const resolvedCert = sslCert;
  const resolvedKey = sslKey;

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
  const httpServer =
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
  setHttpServer(httpServer);

  // Start listening
  return new Promise((resolve, reject) => {
    httpServer.on("error", reject);
    httpServer.listen(port, host, () => {
      const addr = httpServer.address();

      resolve({ port: addr?.port ?? port, host, token: serverToken });
    });
  });
}
