/**
 * requestHandler's full branch surface: preflight, health, 401/429 auth, 403
 * origin denial, session-less GET/DELETE, 404/405, the body cap, and a real
 * session riding GET /mcp. Binds an ephemeral port per suite run.
 */
import { strict as assert } from "node:assert";
import { after, before, test } from "node:test";

import { loadAllSkills } from "../../../core/skills/index.js";
import { startHttpServer, stopHttpServer } from "../index.js";
import { ALLOWED_ORIGINS } from "../_state.js";

process.env.RULE_MCP_SSE_TOKEN = "b".repeat(64);
process.env.RULE_MCP_DISABLE_AUTO_ADR = "1";

const TOKEN = process.env.RULE_MCP_SSE_TOKEN;

let base;
let port;

before(async () => {
  await loadAllSkills();
  ({ port } = await startHttpServer({ port: 0 }));
  base = `http://127.0.0.1:${port}/mcp`;
});

after(() => stopHttpServer());

/** One request with arbitrary method/path/headers, returning status + headers. */
async function req(method, path = "/mcp", options = {}) {
  const headers = { Authorization: `Bearer ${TOKEN}`, ...(options.headers ?? {}) };
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers, body: options.body });
  return { status: res.status, body: await res.text(), headers: Object.fromEntries(res.headers.entries()) };
}

const initBody = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "handler-test", version: "0.0.0" } },
});

test("OPTIONS preflight is answered with 204", async () => {
  const preflight = await req("OPTIONS", "/mcp", { headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "POST" } });
  assert.equal(preflight.status, 204, "preflight ends the request");
});

test("an allowed origin gets CORS headers back", async () => {
  ALLOWED_ORIGINS.add("http://localhost:3000");
  try {
    const res = await req("POST", "/mcp", {
      headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" },
      body: initBody,
    });
    assert.equal(res.headers["access-control-allow-origin"], "http://localhost:3000", "the origin is echoed");
    assert.match(res.headers["access-control-allow-methods"], /POST/, "the method list is advertised");
  } finally {
    ALLOWED_ORIGINS.delete("http://localhost:3000");
  }
});

test("/health is public and skips auth", async () => {
  const health = await req("GET", "/health", { headers: { Authorization: "" } });
  assert.equal(health.status, 200, "health needs no token");
  assert.match(health.body, /"ok":true/, "health reports ok");
});

test("failed auth is 401, then rate-limited to 429 on loopback", async () => {
  const first = await req("POST", "/mcp", { headers: { Authorization: "Bearer wrong" } });
  assert.equal(first.status, 401, "a wrong token is unauthorized");

  for (let i = 0; i < 61; i++) {
    await req("POST", "/mcp", { headers: { Authorization: "Bearer wrong" } });
  }
  const limited = await req("POST", "/mcp", { headers: { Authorization: "Bearer wrong" } });
  assert.equal(limited.status, 429, "after the loopback budget is spent the limiter refuses");
  assert.match(limited.body, /Too many failed auth attempts/, "the 429 names the reason");
});

test("a disallowed origin is refused with 403 on protected endpoints", async () => {
  const res = await req("POST", "/mcp", { headers: { Origin: "http://evil.example", "Content-Type": "application/json" }, body: initBody });
  assert.equal(res.status, 403, "cross-origin denial");
  assert.match(res.body, /Cross-origin/, "the error names the rule");
});

test("unknown paths and methods on /mcp are 404 and 405", async () => {
  const notFound = await req("GET", "/nope");
  assert.equal(notFound.status, 404, "unknown path is not found");

  const method = await req("PUT", "/mcp");
  assert.equal(method.status, 405, "PUT is not allowed");
  assert.match(method.headers.allow, /POST/, "the Allow header names the methods");
});

test("GET and DELETE without a session are 404", async () => {
  const get = await req("GET", "/mcp", { headers: { "Mcp-Session-Id": "missing" } });
  assert.equal(get.status, 404, "GET needs an existing session");
  assert.match(get.body, /No session found/, "the error names the missing session");

  const del = await req("DELETE", "/mcp", { headers: { "Mcp-Session-Id": "missing" } });
  assert.equal(del.status, 404, "DELETE needs an existing session");
});

test("an initialized session rides GET /mcp and ends on DELETE", async () => {
  const init = await req("POST", "/mcp", { headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: initBody });
  assert.equal(init.status, 200, "initialize works");
  const sessionId = init.headers["mcp-session-id"];
  assert.ok(sessionId, "initialize returns a session id");

  const stream = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: "GET",
    headers: { Authorization: `Bearer ${TOKEN}`, "Mcp-Session-Id": sessionId, Accept: "text/event-stream" },
  });
  assert.equal(stream.status, 200, "GET /mcp opens the server stream");
  assert.match(stream.headers.get("content-type") ?? "", /event-stream/, "the response is an SSE stream");
  await stream.body?.cancel(); // the stream stays open until the session ends

  const del = await req("DELETE", "/mcp", { headers: { "Mcp-Session-Id": sessionId } });
  assert.equal(del.status, 200, "DELETE ends the session");

  const gone = await req("GET", "/mcp", { headers: { "Mcp-Session-Id": sessionId } });
  assert.equal(gone.status, 404, "the ended session is no longer found");
});

test("an oversized body is refused with 413", async () => {
  const res = await req("POST", "/mcp", {
    headers: { "Content-Type": "application/json" },
    body: `{"pad":"${"x".repeat(1_048_600)}"}`,
  });
  assert.equal(res.status, 413, "the body cap applies");
  assert.match(res.body, /too large/, "the error names the cap");
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
  assert.match(body, /"ok":true/, "and the body is the health payload");
});
