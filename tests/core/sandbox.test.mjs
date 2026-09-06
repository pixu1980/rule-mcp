/**
 * @module test/sandbox.test
 *
 * TDD tests for the sandbox/resilience layer.
 * Tests: safeJsonParse, withTimeout, trySafe, wrapRequestHandler
 */

import http from "node:http";
import { createServer } from "node:http";

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

console.log("=== Sandbox / Resilience Tests ===\n");

const { safeJsonParse, withTimeout, trySafe, wrapRequestHandler } = await import("../../src/utils/sandbox.js");

// ── safeJsonParse ──
check("safeJsonParse valid JSON", safeJsonParse('{"a":1}')?.a === 1);
check("safeJsonParse invalid undefined", safeJsonParse("not json") === undefined);
check("safeJsonParse empty undefined", safeJsonParse("") === undefined);

// ── withTimeout ──
check("withTimeout fast resolves", (await withTimeout(Promise.resolve("done"), 1000, "fast")) === "done");
try {
  await withTimeout(new Promise((r) => setTimeout(r, 50_000)), 10, "slow");
  check("withTimeout slow rejects", false);
} catch (error) {
  check("withTimeout slow timeout msg", error.message.includes("Sandbox timeout"));
}

// ── trySafe ──
check("trySafe ok", (await trySafe(() => Promise.resolve(42))).ok === true);
check("trySafe fail", (await trySafe(() => Promise.reject(new Error("boom")))).ok === false);
check(
  "trySafe sync",
  (
    await trySafe(() => {
      throw new Error("sync");
    })
  ).ok === false,
);

// Helper: issue HTTP request and collect response
const httpGet = (url) =>
  new Promise((resolve, reject) => {
    const agent = new http.Agent({ keepAlive: false, timeout: 2000 });
    const request = http.get(url, { agent }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        agent.destroy();
        resolve({ status: res.statusCode, body: data });
      });
    });
    request.on("error", (e) => {
      agent.destroy();
      reject(e);
    });
    request.setTimeout(3000, () => {
      request.destroy();
      agent.destroy();
      reject(new Error("req timeout"));
    });
    request.end();
  });

// ── wrapRequestHandler: success handler ──
const srv1 = createServer(
  wrapRequestHandler(async (request, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  }),
);
await new Promise((r) => srv1.listen(0, "127.0.0.1", r));
const a1 = srv1.address();
check("wrap success 200", (await httpGet(`http://127.0.0.1:${a1.port}/ok`)).status === 200);
await new Promise((r) => srv1.close(r));

// ── wrapRequestHandler: handler that throws ──
const srv2 = createServer(
  wrapRequestHandler(async () => {
    throw new Error("broke");
  }),
);
await new Promise((r) => srv2.listen(0, "127.0.0.1", r));
const a2 = srv2.address();
const r2 = await httpGet(`http://127.0.0.1:${a2.port}/crash`);
check("wrap throw 500", r2.status === 500);
// Security (F5): internal error detail must NOT leak to the client; only a generic
// message is returned. Full detail is written to stderr server-side.
check("wrap throw hides detail", JSON.parse(r2.body).detail === undefined);
check("wrap throw generic message", JSON.parse(r2.body).error === "Internal server error");
await new Promise((r) => srv2.close(r));

// ── wrapRequestHandler: handler that times out ──
const srv3 = createServer(
  wrapRequestHandler(
    async () => {
      await new Promise(() => {});
    },
    { timeout: 50 },
  ),
);
await new Promise((r) => srv3.listen(0, "127.0.0.1", r));
const a3 = srv3.address();
const r3 = await httpGet(`http://127.0.0.1:${a3.port}/hang`);
check("wrap timeout 408", r3.status === 408);
check("wrap timeout msg", JSON.parse(r3.body).error === "Request timed out");
await new Promise((r) => srv3.close(r));

// ── wrapRequestHandler: handler that sends no response ──
const srv4 = createServer(wrapRequestHandler(async () => {}));
await new Promise((r) => srv4.listen(0, "127.0.0.1", r));
const a4 = srv4.address();
const r4 = await httpGet(`http://127.0.0.1:${a4.port}/nores`);
check("wrap nores 500", r4.status === 500);
check("wrap nores msg", JSON.parse(r4.body).error === "Handler did not send a response");
await new Promise((r) => srv4.close(r));

console.log(`\nResults: ${pass} passed, ${fail} failed`);
setTimeout(() => process.exit(fail > 0 ? 1 : 0), 100);
