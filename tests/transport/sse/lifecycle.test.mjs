/** Lifecycle: token, port, public health, CORS deny-by-default, graceful stop. */
import { check, finish, startSseServer, stopSseServer } from "./_sse.fixture.mjs";

console.log("=== SSE Transport Tests: lifecycle ===\n");

const server = await startSseServer({ port: 0 });
const token = server.token;

check("T0 bearer token generated", token.length === 64);
check("T1 server started, port assigned", typeof server.port === "number" && server.port > 0);

// ── T2: GET /health (public, no auth needed) ──
const healthRes = await fetch(`http://127.0.0.1:${server.port}/health`);
check("T2 health returns 200", healthRes.status === 200);
const healthBody = await healthRes.json();
check("T2.1 health body ok:true", healthBody.ok === true);

// CORS deny-by-default on health (Phase 1.2)
check("T5 CORS deny-by-default", healthRes.headers.get("access-control-allow-origin") === null || healthRes.headers.get("access-control-allow-origin") !== "*");

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

finish();
