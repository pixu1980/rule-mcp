/** @module transport/http/start */

import http from "node:http";
import https from "node:https";
import { readFileSync } from "node:fs";
import { DEFAULT_SSE_PORT, getSseHost } from "../../cli/paths.js";
import { wrapRequestHandler } from "../../utils/index.js";
import { generateSelfSignedCert } from "../_cert.js";
import { getOrCreateSseBearerToken } from "../_sse-auth.js";
import { requestHandler } from "./_handler.js";
import { setHttpServer, setServerToken } from "./_state.js";

/**
 * Start the Streamable HTTP server.
 *
 * @param {{ port?: number, host?: string, sslCert?: string, sslKey?: string }} [options]
 * @returns {Promise<{ port: number, host: string, token: string }>}
 */
export async function startHttpServer(options = {}) {
  const port = options.port ?? (Number(process.env.RULE_MCP_PORT) || DEFAULT_SSE_PORT);
  const host = options.host ?? getSseHost();
  const { sslCert, sslKey } = options;

  const serverToken = getOrCreateSseBearerToken();
  setServerToken(serverToken);
  console.error("[rule-mcp] Streamable HTTP authentication enabled");

  if (sslCert && sslKey) {
    try {
      readFileSync(sslCert);
      readFileSync(sslKey);
    } catch {
      const generated = generateSelfSignedCert({ certPath: sslCert, keyPath: sslKey });

      if (!generated) {
        throw new Error(`Failed to generate self-signed cert at ${sslCert}. Provide valid --ssl-cert and --ssl-key.`);
      }

      console.error(`[rule-mcp] Generated self-signed cert: ${sslCert}`);
    }
  }

  const safeHandler = wrapRequestHandler(requestHandler, { timeout: 60_000 });

  const httpServer =
    sslCert && sslKey
      ? https.createServer({ cert: readFileSync(sslCert), key: readFileSync(sslKey) }, safeHandler)
      : http.createServer(safeHandler);

  // Streams are long-lived; disable the generic idle timeout.
  httpServer.timeout = 0;
  httpServer.keepAliveTimeout = 10_000;
  setHttpServer(httpServer);

  return new Promise((resolve, reject) => {
    httpServer.on("error", reject);
    httpServer.listen(port, host, () => {
      const addr = httpServer.address();

      resolve({ port: addr?.port ?? port, host, token: serverToken });
    });
  });
}
