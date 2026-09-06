/**
 * Regression: a shared daemon must keep more than one authenticated MCP client
 * alive. Selecting Pi and VS Code must not make each new connection evict the
 * previous client and trigger reconnect loops.
 */
import { strict as assert } from "node:assert";
import { get as httpGet, request as httpRequest } from "node:http";
import { loadAllSkills } from "../../src/core/skills/index.js";
import { getOrCreateSseBearerToken } from "../../src/transport/_sse-auth.js";
import { startSseServer, stopSseServer } from "../../src/transport/sse/index.js";

const openSse = (port, token) =>
  new Promise((resolve, reject) => {
    const request = httpGet(
      {
        hostname: "127.0.0.1",
        port,
        path: "/sse",
        headers: { Authorization: `Bearer ${token}` },
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk.toString();
          const match = body.match(/sessionId=([^\s]+)/);
          if (match) {
            resolve({ response, sessionId: match[1] });
          }
        });
        response.on("error", reject);
      },
    );
    request.on("error", reject);
  });

const postToolsList = (port, token, sessionId) =>
  new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: "2.0", id: "1", method: "tools/list" });
    const request = httpRequest(
      {
        hostname: "127.0.0.1",
        port,
        path: `/message?sessionId=${sessionId}`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode));
      },
    );
    request.on("error", reject);
    request.end(body);
  });

await loadAllSkills();
const token = getOrCreateSseBearerToken();
const server = await startSseServer({ port: 0 });

try {
  const first = await openSse(server.port, token);
  const second = await openSse(server.port, token);

  assert.notEqual(first.sessionId, second.sessionId, "each client receives an independent session");
  assert.equal(
    await postToolsList(server.port, token, first.sessionId),
    202,
    "first client stays usable after second connects",
  );
  assert.equal(await postToolsList(server.port, token, second.sessionId), 202, "second client is usable");

  first.response.destroy();
  second.response.destroy();
} finally {
  await stopSseServer();
}

console.log("  ✅ SSE daemon supports simultaneous Pi and VS Code clients");
