// test/architect-server-csrf.test.mjs
//
// Audit finding 03 - both interview servers write files into the user's project
// on POST /api/generate with no authentication. They bind loopback and send no
// CORS headers, which stops a cross-site page from *reading* the response but
// not from *sending the request*: with Content-Type: text/plain a cross-origin
// POST is a CORS "simple request", so no preflight is issued and the write
// happens. The attacker never needs to read the reply - the side effect is the
// attack (with `force: true`, an overwrite of files at the project root).
//
// A browser cannot forge Origin, Sec-Fetch-Site, or Host, so validating those
// three headers closes the hole without touching the wizard UI:
//
//   * Sec-Fetch-Site present and not same-origin/none → refuse
//   * Origin present and not a loopback origin        → refuse
//   * Host not loopback                               → refuse (DNS rebinding)
//
// Same-origin fetches from the served page carry same-origin/none values and a
// loopback Host, so the wizard keeps working unchanged.

import test from "node:test";
import assert from "node:assert/strict";

import { checkLocalRequest } from "../skills/rule-architect/http-guard.mjs";

/** Minimal IncomingMessage stand-in: the guard only reads headers. */
const request = (headers) => ({ headers, method: "POST", url: "/api/generate" });

const PORT = 51_234;
const OK = { port: PORT };

// ── Origin ─────────────────────────────────────────────────────────────────

test("a cross-site Origin is refused", () => {
  const result = checkLocalRequest(request({ host: `127.0.0.1:${PORT}`, origin: "https://evil.example" }), OK);
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.match(result.reason, /origin/i);
});

test("a loopback Origin on the served port is accepted", () => {
  for (const origin of [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`]) {
    const result = checkLocalRequest(request({ host: `localhost:${PORT}`, origin }), OK);
    assert.equal(result.ok, true, `${origin} must be accepted`);
  }
});

test("a loopback Origin on a different port is refused", () => {
  // Another local server (or a page served by one) is still a different origin.
  const result = checkLocalRequest(request({ host: `localhost:${PORT}`, origin: "http://localhost:9999" }), OK);
  assert.equal(result.ok, false);
});

test("a missing Origin is accepted (non-browser client, same-origin GET)", () => {
  assert.equal(checkLocalRequest(request({ host: `localhost:${PORT}` }), OK).ok, true);
});

// ── Sec-Fetch-Site ─────────────────────────────────────────────────────────

test("Sec-Fetch-Site cross-site is refused even without an Origin header", () => {
  const result = checkLocalRequest(request({ host: `localhost:${PORT}`, "sec-fetch-site": "cross-site" }), OK);
  assert.equal(result.ok, false);
  assert.match(result.reason, /sec-fetch-site|cross/i);
});

test("Sec-Fetch-Site same-site is refused (a sibling origin is not this origin)", () => {
  assert.equal(checkLocalRequest(request({ host: `localhost:${PORT}`, "sec-fetch-site": "same-site" }), OK).ok, false);
});

test("Sec-Fetch-Site same-origin and none are accepted", () => {
  for (const value of ["same-origin", "none"]) {
    assert.equal(checkLocalRequest(request({ host: `localhost:${PORT}`, "sec-fetch-site": value }), OK).ok, true);
  }
});

// ── Host (DNS rebinding) ───────────────────────────────────────────────────

test("a non-loopback Host is refused", () => {
  for (const host of ["evil.example", `evil.example:${PORT}`, "192.168.1.20:37999"]) {
    const result = checkLocalRequest(request({ host }), OK);
    assert.equal(result.ok, false, `${host} must be refused`);
    assert.match(result.reason, /host/i);
  }
});

test("loopback Host forms are accepted", () => {
  for (const host of [`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`]) {
    assert.equal(checkLocalRequest(request({ host }), OK).ok, true, `${host} must be accepted`);
  }
});

test("a missing Host is refused (HTTP/1.1 requires it)", () => {
  assert.equal(checkLocalRequest(request({}), OK).ok, false);
});

test("a Host on the wrong port is refused when the port is known", () => {
  assert.equal(checkLocalRequest(request({ host: "localhost:9999" }), OK).ok, false);
});

// ── Both servers must apply the guard to their write endpoint ──────────────

test("both interview servers refuse a cross-site POST to /api/generate", async () => {
  const { once } = await import("node:events");
  const servers = [
    await import("../skills/rule-architect/assets/context-server.mjs"),
    await import("../skills/rule-architect-web/server.mjs"),
  ];

  for (const module_ of servers) {
    const server = module_.createServer(process.cwd());
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const { port } = server.address();

    const response = await fetch(`http://127.0.0.1:${port}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "text/plain", Origin: "https://evil.example" },
      body: JSON.stringify({ values: { PROJECT_NAME: "pwned" }, force: true }),
    });
    assert.equal(response.status, 403, "cross-site write must be refused");

    // A same-origin POST must still reach the handler (any status but 403).
    const allowed = await fetch(`http://127.0.0.1:${port}/api/placeholders`, {
      headers: { Origin: `http://127.0.0.1:${port}`, "Sec-Fetch-Site": "same-origin" },
    });
    assert.notEqual(allowed.status, 403, "same-origin request must not be refused");

    server.close();
    await once(server, "close");
  }
});
