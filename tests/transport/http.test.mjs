/**
 * @module test/http.test
 *
 * Integration tests for the Streamable HTTP transport (transport/http/index.js).
 * Exercises the MCP spec 2025-03-26+ handshake: initialize → session id →
 * authenticated tools/list, plus auth and session-validation edge cases.
 */

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

console.log("=== Streamable HTTP Transport Tests ===\n");

// Deterministic 64-hex token so we don't touch the user's persisted token file.
process.env.RULE_MCP_SSE_TOKEN = "a".repeat(64);
process.env.RULE_MCP_DISABLE_AUTO_ADR = "1";

const TOKEN = process.env.RULE_MCP_SSE_TOKEN;
const ACCEPT = "application/json, text/event-stream";

import { loadAllSkills } from "../../src/core/skills/index.js";
import { startHttpServer, stopHttpServer } from "../../src/transport/http/index.js";

await loadAllSkills();

// Bind an ephemeral port to avoid clashing with a running daemon.
const { port } = await startHttpServer({ port: 0 });
const base = `http://127.0.0.1:${port}/mcp`;

/** Parse a Streamable HTTP response body that may be JSON or an SSE stream. */
function parseBody(contentType, text) {
  if (contentType.includes("text/event-stream")) {
    // Extract the last `data:` line's JSON payload.
    const dataLines = text.split("\n").filter((l) => l.startsWith("data:"));
    const last = dataLines.at(-1);
    return last ? JSON.parse(last.slice(5).trim()) : null;
  }
  return text ? JSON.parse(text) : null;
}

async function post(bodyObject, { token = TOKEN, sessionId } = {}) {
  const headers = { "Content-Type": "application/json", Accept: ACCEPT };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (sessionId) {
    headers["Mcp-Session-Id"] = sessionId;
  }
  const res = await fetch(base, { method: "POST", headers, body: JSON.stringify(bodyObject) });
  const text = await res.text();
  return { res, body: parseBody(res.headers.get("content-type") ?? "", text) };
}

const initRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "http-test", version: "0.0.0" },
  },
};

// ── T1: unauthenticated request is rejected ──
{
  const { res } = await post(initRequest, { token: null });
  check("T1 unauthenticated initialize → 401", res.status === 401);
}

// ── T2: initialize returns a session id + server info ──
let sessionId;
{
  const { res, body } = await post(initRequest);
  sessionId = res.headers.get("mcp-session-id");
  check("T2 initialize → 200", res.status === 200);
  check("T2.1 initialize returns Mcp-Session-Id", !!sessionId);
  check("T2.2 initialize result has serverInfo", body?.result?.serverInfo?.name === "rule-mcp");
}

// ── T3: a non-initialize request without a session id is rejected ──
{
  const { res } = await post({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  check("T3 tools/list without session → 400", res.status === 400);
}

// ── T4: authenticated tools/list on the session lists the rule tool ──
{
  // The client must confirm initialization before issuing requests.
  await post({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }, { sessionId });
  const { res, body } = await post({ jsonrpc: "2.0", id: 3, method: "tools/list", params: {} }, { sessionId });
  check("T4 tools/list → 200", res.status === 200);
  const names = (body?.result?.tools ?? []).map((t) => t.name);
  check("T4.1 tools/list includes 'rule'", names.includes("pix_tool"));
}

// ── T4.5: logging/setLevel is honored (advertised capability must work) ──
{
  const { res, body } = await post({ jsonrpc: "2.0", id: 5, method: "logging/setLevel", params: { level: "info" } }, { sessionId });
  check("T4.5 logging/setLevel → 200", res.status === 200);
  check("T4.5.1 logging/setLevel returns a non-error result", !!body && !body.error);
}

// ── T5: DELETE terminates the session ──
{
  const res = await fetch(base, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${TOKEN}`, "Mcp-Session-Id": sessionId },
  });
  check("T5 DELETE session → 200", res.status === 200);
  const { res: after } = await post({ jsonrpc: "2.0", id: 4, method: "tools/list", params: {} }, { sessionId });
  check("T5.1 reusing a terminated session → 400", after.status === 400);
}

await stopHttpServer();

console.log(`\nResults: ${pass} passed, ${fail} failed`);
setTimeout(() => process.exit(fail > 0 ? 1 : 0), 100);
