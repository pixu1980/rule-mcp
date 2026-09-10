

/** The SSE transport request handler: every arm on an ephemeral in-process server. */
import { strict as assert } from "node:assert";
import { after, before, test } from "node:test";

import { loadAllSkills } from "../../../core/skills/index.js";
import { startSseServer, stopSseServer } from "../index.js";
import { ALLOWED_ORIGINS } from "../_state.js";

process.env.RULE_MCP_SSE_TOKEN = "d".repeat(64);
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const TOKEN = process.env.RULE_MCP_SSE_TOKEN;

let port;

before(async () => {
  await loadAllSkills();
  ({ port } = await startSseServer({ port: 0 }));
});

after(() => stopSseServer());

async function req(method, path, options = {}) {
  const headers = { Authorization: `Bearer ${TOKEN}`, ...options.headers };
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers, body: options.body });

  return { status: res.status, text: await res.text(), headers: Object.fromEntries(res.headers.entries()) };
}

test("OPTIONS preflight is answered with 204 and an allowed origin gets headers", async () => {
  const preflight = await req("OPTIONS", "/sse", { headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "POST" } });
  assert.equal(preflight.status, 204, "preflight ends the request");

  ALLOWED_ORIGINS.add("http://localhost:3000");
  try {
    const cors = await req("OPTIONS", "/sse", { headers: { Origin: "http://localhost:3000" } });
    assert.equal(cors.headers["access-control-allow-origin"], "http://localhost:3000", "the origin is echoed");
  } finally {
    ALLOWED_ORIGINS.delete("http://localhost:3000");
  }
});

test("/health is public, a bad token is 401 then 429, and a bad origin is 403", async () => {
  const health = await req("GET", "/health", { headers: { Authorization: "" } });
  assert.equal(health.status, 200, "health needs no token");
  assert.match(health.text, /"ok":true/, "health reports ok");

  const unauthorized = await req("POST", "/message", { headers: { Authorization: "Bearer wrong" } });
  assert.equal(unauthorized.status, 401, "a wrong token is unauthorized");

  for (let index = 0; index < 62; index++) {
    await req("GET", "/sse", { headers: { Authorization: "Bearer wrong" } });
  }
  const limited = await req("GET", "/sse", { headers: { Authorization: "Bearer wrong" } });
  assert.equal(limited.status, 429, "after the loopback budget the limiter refuses");

  const denied = await req("GET", "/sse", { headers: { Origin: "https://evil.example" } });
  assert.equal(denied.status, 403, "cross-origin denial");
  assert.match(denied.text, /Cross-origin/, "the error names the rule");
});

test("an unknown path is 404", async () => {
  const notFound = await req("GET", "/nope");
  assert.equal(notFound.status, 404, "unknown paths are not found");
});

test("an authenticated /sse open starts the stream", async () => {
  const controller = new AbortController();
  const res = await fetch(`http://127.0.0.1:${port}/sse`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "text/event-stream" },
    signal: controller.signal,
  });
  assert.equal(res.status, 200, "the sse endpoint opens");
  assert.match(res.headers.get("content-type") ?? "", /event-stream/, "the response is a stream");
  controller.abort();
});
test("a hostless HTTP/1.0 request still resolves the URL", async () => {
  const { connect } = await import("node:net");
  const body = await new Promise((resolve, reject) => {
    const socket = connect(port, "127.0.0.1");
    socket.setEncoding("utf8");
    let text = "";
    socket.on("data", (chunk) => (text += chunk));
    socket.on("end", () => resolve(text));
    socket.on("error", reject);
    socket.write("GET /health HTTP/1.0\r\n\r\n");
  });
  assert.match(body, /HTTP\/1\.\d 200/, "no Host header still answers /health");
});
