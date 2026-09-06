/** @module transport/http/mcp-route - POST /mcp: initialize or relay one JSON-RPC message */

import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../../server.js";
import { safeJsonParse } from "../../utils/index.js";
import { readBody, sendJsonRpcError } from "./_guards.js";
import { MAX_SESSIONS, transports } from "./_state.js";

/**
 * Handle POST /mcp: a new session on initialize, a relay otherwise.
 *
 * @param {import("node:http").IncomingMessage} request
 * @param {import("node:http").ServerResponse} res
 * @param {{ transport?: object }|undefined} existing - the session the header named
 * @param {string|string[]|undefined} sessionId
 */
export async function handleMcpPost(request, res, existing, sessionId) {
  const body = await readBody(request, res);

  if (body === null) {
    return;
  } // 413 already sent
  const parsed = safeJsonParse(body);

  if (parsed === undefined) {
    sendJsonRpcError(res, 400, -32_700, "Parse error: invalid JSON in request body");

    return;
  }

  let transport = existing?.transport;

  if (!transport) {
    // A new session is only allowed on an initialize request with no session id.
    if (sessionId || !isInitializeRequest(parsed)) {
      sendJsonRpcError(res, 400, -32_000, "Bad Request: no valid session id for a non-initialize request");

      return;
    }

    if (transports.size >= MAX_SESSIONS) {
      sendJsonRpcError(res, 503, -32_000, "Server session limit reached. Close an existing session and retry.");

      return;
    }

    const server = createServer();
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports.set(sid, { transport, server });
      },
    });
    transport.onclose = () => {
      const sid = transport.sessionId;

      if (sid && transports.delete(sid)) {
        void server.close().catch(() => {});
      }
    };
    await server.connect(transport);
  }

  await transport.handleRequest(request, res, parsed);
}
