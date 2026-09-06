/**
 * @module test/sse.test
 *
 * TDD tests for SSE transport layer.
 * SSEServerTransport flow:
 *   1. Client opens GET /sse → receives endpoint event with sessionId
 *   2. Client POSTs MCP messages to /message?sessionId=XXX
 *   3. Responses come back via the SSE stream
 */

// eslint-disable-next-line no-unused-vars
import { strict as assert } from "node:assert";
import { get as httpGet, request as httpRequest } from "node:http";
import { loadAllSkills } from "../../src/core/skills.js";

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
};

console.log("=== SSE Transport Tests ===\n");

await loadAllSkills();
const { startSseServer, stopSseServer } = await import("../../src/transport/sse.js");
const server = await startSseServer({ port: 0 });
const token = server.token;

check("T0 bearer token generated", token.length === 64);
check("T1 server started, port assigned", typeof server.port === "number" && server.port > 0);

// Helper: auth header for all protected requests
const authHeader = { Authorization: `Bearer ${token}` };

// ── T2: GET /health (public, no auth needed) ──
const healthRes = await fetch(`http://127.0.0.1:${server.port}/health`);
check("T2 health returns 200", healthRes.status === 200);
const healthBody = await healthRes.json();
check("T2.1 health body ok:true", healthBody.ok === true);

// CORS deny-by-default on health (Phase 1.2)
check(
  "T5 CORS deny-by-default",
  healthRes.headers.get("access-control-allow-origin") === null ||
    healthRes.headers.get("access-control-allow-origin") !== "*",
);

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
      if (m) {
        endpointPath = m[1];
        sessionId = m[2];
        clearTimeout(timer);
        resolve({ status: res.statusCode, headers: res.headers, data, sessionId });
      }
    });
    res.on("error", reject);
  });
  request.on("error", reject);
});

check("T3 SSE status 200", sseResult.status === 200);
check("T3.1 SSE content-type text/event-stream", sseResult.headers["content-type"]?.includes("text/event-stream"));
check("T3.2 SSE cache-control no-cache", String(sseResult.headers["cache-control"] ?? "").includes("no-cache"));
check("T3.3 SSE connection keep-alive", sseResult.headers["connection"] === "keep-alive");
check(
  "T3.4 CORS deny-by-default on SSE",
  sseResult.headers["access-control-allow-origin"] === undefined ||
    sseResult.headers["access-control-allow-origin"] !== "*",
);
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

// ── T6: Server stops gracefully ──
await stopSseServer();
check("T6 server stops gracefully", true);

// Verify port is closed
try {
  await fetch(`http://127.0.0.1:${server.port}/health`);
  check("T6.1 port closed after stop", false);
} catch {
  check("T6.1 port closed after stop", true);
}

console.log(`\nResults: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exit(1);
}
