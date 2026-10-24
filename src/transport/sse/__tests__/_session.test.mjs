/** The session flow: endpoint event, sessionId, and the POST /message channel. */
import { get as httpGet, request as httpRequest } from "node:http";

import { check, finish, startSseServer, stopSseServer } from "./_sse.fixture.mjs";

console.log("=== SSE Transport Tests: session ===\n");

const server = await startSseServer({ port: 0 });

const authHeader = { Authorization: `Bearer ${server.token}` };

// ── T3 + T4: Open SSE connection with auth, get sessionId, POST MCP message ──
let sessionId = "";
// eslint-disable-next-line no-unused-vars
let endpointPath = "";

// Open SSE connection and collect the endpoint event
const sseResult = await new Promise((resolve, reject) => {
  const options = {
    hostname: "127.0.0.1",
    port: server.port,
    path: "/sse",
    headers: authHeader,
  };
  const request = httpGet(options, (res) => {
    let data = "";
    const timer = setTimeout(() => {
      // After 1s, resolve with what we have
      resolve({ status: res.statusCode, headers: res.headers, data, sessionId });
    }, 2000);

    res.on("data", (chunk) => {
      data += chunk.toString();
      // Parse endpoint event: event: endpoint\ndata: /message?sessionId=XXX
      const m = data.match(/data:\s*(\/[^\s]*sessionId=([^\s]+))/);
      if (!m) {
        return;
      }

      endpointPath = m[1];
      sessionId = m[2];
      clearTimeout(timer);
      resolve({ status: res.statusCode, headers: res.headers, data, sessionId });
    });
    res.on("error", reject);
  });
  request.on("error", reject);
});

check("T3 SSE status 200", sseResult.status === 200);
check("T3.1 SSE content-type text/event-stream", sseResult.headers["content-type"]?.includes("text/event-stream"));
check("T3.2 SSE cache-control no-cache", String(sseResult.headers["cache-control"] ?? "").includes("no-cache"));
check("T3.3 SSE connection keep-alive", sseResult.headers["connection"] === "keep-alive");
check("T3.4 CORS deny-by-default on SSE", sseResult.headers["access-control-allow-origin"] === undefined || sseResult.headers["access-control-allow-origin"] !== "*");
check("T4 sessionId received", sessionId.length > 0);
check("T4.1 sessionId format UUID", /^[a-f0-9-]{36}$/i.test(sessionId));

// ── T4.2: POST tools/list via the SSE session ──
const mcpRequest = JSON.stringify({
  jsonrpc: "2.0",
  id: "1",
  method: "tools/list",
});

const postResult = await new Promise((resolve, reject) => {
  const request = httpRequest(
    {
      hostname: "127.0.0.1",
      port: server.port,
      path: `/message?sessionId=${sessionId}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(mcpRequest),
        ...authHeader,
      },
    },
    (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    },
  );
  request.on("error", reject);
  request.write(mcpRequest);
  request.end();
});

check("T4.2 POST /message status 202", postResult.status === 202);
check("T4.3 POST body Accepted", postResult.body?.includes("Accepted"));

await stopSseServer();

finish();
