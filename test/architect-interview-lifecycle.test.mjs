// test/architect-interview-lifecycle.test.mjs
//
// Audit findings 04 + 05 — the interview server the MCP tool spawns had no
// lifecycle at all:
//
//   04. The promise resolved on the first URL line (or after a 5s timeout) and
//       nothing ever killed the child. Every call left another HTTP server
//       listening with write access to a project directory, outliving the MCP
//       server itself, while stdout listeners kept appending to a string that
//       was never read again.
//   05. pix_architect was absent from the cache denylist, so the result
//       "Server started! Open http://localhost:51234" was cached — persisted
//       gzipped, surviving restarts — and every later identical call replayed
//       that text WITHOUT spawning anything. The user opens a dead port while
//       the tool reports success.
//
// Fixes pinned here: a tracked registry with reuse per target directory and a
// stop-all that actually kills, plus the denylist entry.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.RULE_MCP_NO_AUTOUPDATE = "1"; // hermetic: no git in tests

// ── 05: the interview result must never be cached ──────────────────────────

test("rule_tool_architect is excluded from the deterministic result cache", async () => {
  const { cacheKey } = await import("../src/core/tool-cache.js");
  assert.equal(
    cacheKey("rule_tool_architect", { mode: "interview" }),
    null,
    "a tool that spawns a process and returns an ephemeral port is not cacheable",
  );
});

test("read-only tools are still cacheable", async () => {
  const { cacheKey } = await import("../src/core/tool-cache.js");
  assert.ok(cacheKey("rule_tool_styleguide", { mode: "full" }), "the denylist must stay narrow");
});

// ── 04: spawned servers are tracked, reused, and killed ────────────────────

test("interview servers are tracked, reused per target, and stopped", async () => {
  const { startContextServer, listInterviewServers, stopInterviewServers } =
    await import("../src/tools/architect.js");

  const target = mkdtempSync(join(tmpdir(), "rule-interview-"));
  try {
    const first = await startContextServer("rule-architect", target);
    assert.ok(Array.isArray(first.content), "the tool must return MCP content");

    const running = listInterviewServers();
    assert.equal(running.length, 1, "the spawned child must be tracked");
    assert.equal(running[0].targetDir, target);
    assert.ok(running[0].pid > 0, "the registry must carry a live pid");

    // A second call for the same target reuses the running server instead of
    // leaving a second one listening on another port.
    const second = await startContextServer("rule-architect", target);
    assert.equal(listInterviewServers().length, 1, "the second call must reuse, not spawn");
    assert.match(second.content[0].text, /already running|reus/i);

    const { pid } = running[0];
    const stopped = stopInterviewServers();
    assert.equal(stopped, 1, "stopInterviewServers must report what it killed");
    assert.equal(listInterviewServers().length, 0, "the registry must be empty after stop");

    // The process must actually be gone, not merely forgotten.
    await new Promise((r) => setTimeout(r, 300));
    assert.throws(() => process.kill(pid, 0), /ESRCH/, "the child must be dead");
  } finally {
    stopInterviewServers();
  }
});
