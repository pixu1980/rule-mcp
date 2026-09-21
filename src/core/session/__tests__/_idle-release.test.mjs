

/** Idle memory release: heap handed back, reloaded from disk, no timer armed. */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ── Idle memory release ───────────────────────────────────────────

test("releaseMemory hands the heap back and reloads from disk", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "rule-cache-release-"));
  const previous = process.env.RULE_MCP_STATE_DIR;
  process.env.RULE_MCP_STATE_DIR = stateDir;
  try {
    const cache = await import("../../cache/tool-cache/index.js");
    const key = cache.cacheKey("rule_tool_search", { query: "release" });
    cache.cacheSet(key, { content: [{ type: "text", text: "kept" }] });
    assert.ok(cache.cacheGet(key), "the entry was not stored");

    const freed = cache.releaseMemory();
    assert.equal(freed > 0, true, "releaseMemory reported nothing freed");
    assert.equal(cache.memoryEntryCount(), 0, "the in-memory tier was not emptied");

    // The persistent tier still has it: the next lookup reloads the file.
    const back = cache.cacheGet(key);
    assert.ok(back, "the entry did not survive the release");
    assert.equal(back.content[0].text, "kept");
  } finally {
    if (previous === undefined) {
      delete process.env.RULE_MCP_STATE_DIR;
    } else {
      process.env.RULE_MCP_STATE_DIR = previous;
    }
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("an idle server drops the search index and the skill cache", async () => {
  const { loadAllSkills, skillCache } = await import("../../skills/index.js");
  const { isIndexReady, buildIndex } = await import("../../bm25/index.js");
  const reclaim = await import("../_reclaim.js");
  const activity = await import("../_activity.js");

  await loadAllSkills();
  buildIndex();
  assert.equal(isIndexReady(), true, "the index was not built");

  activity.touchActivity(1000);
  assert.equal(reclaim.reclaimIfIdle({ now: 1000 }), null, "a busy server must keep its index");
  assert.equal(isIndexReady(), true);

  const freed = reclaim.reclaimIfIdle({ now: 1000 + reclaim.IDLE_RECLAIM_MS + 1 });
  assert.ok(freed, "an idle server must reclaim");
  assert.equal(isIndexReady(), false, "the search index was not dropped");
  assert.equal(skillCache.size, 0, "the skill cache was not dropped");

  // Reclaiming twice in a row is a no-op: nothing new was allocated.
  assert.equal(reclaim.reclaimIfIdle({ now: 1000 + reclaim.IDLE_RECLAIM_MS + 2 }), null);

  // The index rebuilds on demand, so the drop costs correctness nothing.
  buildIndex();
  assert.equal(isIndexReady(), true);
});

test("the idle timer never holds the event loop open", async () => {
  const reclaim = await import("../_reclaim.js");
  const timer = reclaim.startIdleReclaim();
  assert.equal(timer.hasRef(), false, "the reclaim interval must be unref'd");
  reclaim.stopIdleReclaim();
});
