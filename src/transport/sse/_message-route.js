/** @module transport/sse/message-route - POST /message: relay one MCP message */

import { safeJsonParse } from "../../utils/index.js";
import { MAX_BODY_BYTES, registry, sessions } from "./_state.js";

/**
 * Handle one MCP message POST for an existing SSE session.
 *
 * @param {import("node:http").IncomingMessage} request
 * @param {import("node:http").ServerResponse} res
 * @param {URL} parsedUrl
 */
export async function handleMessagePost(request, res, parsedUrl) {
  // Body size limit (1 MB)
  let bodyLength = 0;
  const buffers = [];
  const maxBytes = MAX_BODY_BYTES;
  for await (const chunk of request) {
    bodyLength += chunk.length;

    if (bodyLength > maxBytes) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Request body too large. Maximum: " + maxBytes + " bytes." }));

      return;
    }

    buffers.push(chunk);
  }

  const body = Buffer.concat(buffers).toString("utf-8");

  // A live message marks the session in use: the sweep only evicts what
  // has been idle past the ceiling.
  const messagePathMatch = parsedUrl.pathname.match(/\/message\/([^/?#]+)/);

  if (messagePathMatch) {
    registry.touch(messagePathMatch[1]);
  }

  const sessionId = parsedUrl.searchParams.get("sessionId") ?? "";
  const session = sessions.get(sessionId);
  const transport = session?.transport;

  if (!transport) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "No SSE session found for sessionId: " + sessionId }));

    return;
  }

  // Safe JSON parse with error handling
  const parsed = safeJsonParse(body);

  if (!parsed) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON in request body" }));

    return;
  }

  let logged = false;
  const originalEnd = res.end.bind(res);
  res.end = (...args) => {
    if (!logged) {
      logged = true;
      console.error("[sse-debug] POST /message status:", res.statusCode);
    }

    return originalEnd(...args);
  };
  await transport.handlePostMessage(request, res, parsed);
}
