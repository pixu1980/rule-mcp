/**
 * Regression: the SSE daemon must use the persisted token that installer
 * configurations contain; regenerating a token at every start breaks clients.
 */
import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const originalHome = process.env.HOME;
process.env.HOME = mkdtempSync(join(tmpdir(), "rule-mcp-sse-auth-"));

try {
  const { loadAllSkills } = await import("../index.js");
  const { getOrCreateSseBearerToken } = await import("../../../transport/_sse-auth.js");
  const { startSseServer, stopSseServer } = await import("../../../transport/sse/index.js");

  await loadAllSkills();
  const token = getOrCreateSseBearerToken();
  const server = await startSseServer({ port: 0 });

  try {
    const unauthenticated = await fetch(`http://127.0.0.1:${server.port}/sse`);
    assert.equal(unauthenticated.status, 401, "SSE must still reject unauthenticated clients");

    const authenticated = await fetch(`http://127.0.0.1:${server.port}/sse`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(authenticated.status, 200, "persisted installer token must authenticate to SSE");
    await authenticated.body?.cancel();
  } finally {
    await stopSseServer();
  }
} finally {
  if (originalHome === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = originalHome;
  }
}

console.log("  ✅ SSE daemon accepts its persisted installer token");
