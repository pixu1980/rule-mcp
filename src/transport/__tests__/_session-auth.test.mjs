/** The recorder session and the persistent SSE bearer token. */
import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const state = mkdtempSync(join(tmpdir(), "rule-mcp-sess-auth-"));

test.before(() => {
  process.env.RULE_MCP_STATE_DIR = state;
});

test.after(() => {
  rmSync(state, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
  delete process.env.RULE_MCP_SSE_TOKEN;
});

const { setClientInfo, clientInfo, sessionId, currentSession, startSession, endSession, flush } = await import("../../core/telemetry/recorder/index.js");
const { getOrCreateSseBearerToken, getSseTokenFile } = await import("../_sse-auth.js");

test("session lifecycle starts, reports and ends", () => {
  assert.equal(sessionId(), undefined, "no session yet");
  startSession({ transport: "sse", now: 1000 });
  assert.ok(sessionId(), "a session id exists");
  assert.equal(currentSession().transport, "sse", "the transport is remembered");
  assert.equal(currentSession().startedAt, 1000, "the start time is remembered");

  endSession({ now: 2000 });
  assert.equal(currentSession(), undefined, "the session is cleared");
  assert.equal(sessionId(), undefined, "no id after end");

  startSession(); // default transport
  assert.equal(currentSession().transport, "stdio", "the default transport is stdio");
  endSession();
});

test("client info reads name and name/version", () => {
  setClientInfo();
  assert.equal(clientInfo(), undefined, "no client means no info");

  setClientInfo({ name: "pi" });
  assert.equal(clientInfo(), "pi", "a bare name reads");

  setClientInfo({ name: "claude", version: "1.0" });
  assert.equal(clientInfo(), "claude/1.0", "name and version join");
});

test("the persisted token is created, reused and validated", () => {
  const first = getOrCreateSseBearerToken();
  assert.match(first, /^[a-f0-9]{64}$/, "the created token is 64 hex");
  const file = getSseTokenFile();
  assert.ok(readFileSync(file, "utf8").includes(first), "the token is persisted");

  assert.equal(getOrCreateSseBearerToken(), first, "the persisted token is reused");

  process.env.RULE_MCP_SSE_TOKEN = first;
  assert.equal(getOrCreateSseBearerToken(), first, "the environment token wins");
  delete process.env.RULE_MCP_SSE_TOKEN;

  process.env.RULE_MCP_SSE_TOKEN = "not-hex";
  assert.throws(() => getOrCreateSseBearerToken(), /64-character hexadecimal/, "an invalid env token is refused");
  delete process.env.RULE_MCP_SSE_TOKEN;

  writeFileSync(file, "garbage\n");
  assert.throws(() => getOrCreateSseBearerToken(), /Invalid SSE bearer token/, "an invalid persisted token is refused");
});

test("flush is safe on an empty buffer", () => {
  assert.doesNotThrow(() => flush(), "flushing nothing is fine");
});
