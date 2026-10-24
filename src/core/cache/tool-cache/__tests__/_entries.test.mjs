

/** The entry store: freshness eviction, replication, and persistence failure. */
import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "rule-mcp-toolcache-"));

test.before(() => {
  process.env.RULE_MCP_STATE_DIR = stateDir;
  delete process.env.RULE_MCP_NO_CACHE;
});

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
});

const { cacheEntries, cacheGet, cacheSet, flush, cacheKey } = await import("../index.js");

test("cacheSet and cacheGet round-trip a deep copy and count reuse", () => {
  const key = cacheKey("rule_tool", { prompt: "x" });

  assert.equal(cacheGet(key), undefined, "a miss is a miss");
  cacheSet(key, { content: [{ type: "text", text: "hit" }] }, {});
  assert.equal(cacheGet("nope"), undefined, "an unknown key misses");

  const first = cacheGet(key);
  first.content[0].text = "mutated";

  const second = cacheGet(key);
  assert.equal(second.content[0].text, "hit", "the stored copy is not mutated by callers");
});

test("an entry whose dependency has moved is evicted on read", () => {
  const key = cacheKey("rule_tool", { prompt: "reply" });
  cacheSet(key, { content: [{ type: "text", text: "stale depends" }] }, { "rule-mcp-never-a-skill": "abc" });

  assert.equal(cacheGet(key), undefined, "a stale dependence means no reuse");
});

test("error results and missing keys never store", () => {
  const key = cacheKey("rule_tool", { prompt: "err" });
  cacheSet(key, { isError: true, content: [] }, {});
  assert.equal(cacheGet(key), undefined, "an error result is not cached");
  cacheSet("", { content: [] }, {});
});

test("a stored call replays its tool and args through the catalog", () => {
  const key = cacheKey("rule_tool", { prompt: "call" });
  cacheSet(key, { content: [{ type: "text", text: "call" }] }, {}, { tool: "rule_tool", args: { prompt: "call" } });

  const stored = cacheEntries().find((entry) => entry.result?.content?.[0]?.text === "call");
  assert.equal(stored.tool, "rule_tool", "the call tool survives the store");
});

test("a stored call without args reports none", () => {
  const key = cacheKey("rule_tool", { prompt: "noargs" });
  cacheSet(key, { content: [{ type: "text", text: "noargs" }] }, {}, { tool: "rule_tool" });

  const stored = cacheEntries().find((entry) => entry.result?.content?.[0]?.text === "noargs");
  assert.equal(stored.tool, "rule_tool", "the call tool survives the store");
  assert.deepEqual(stored.args, {}, "a call without args stores an empty args object");
});

test("a bare state entry still maps through the report", async () => {
  const { cacheState } = await import("../_state.js");
  const key = "rule-mcp-bare-entry";

  cacheState.store.set(key, { result: undefined, deps: {} });

  try {
    const bare = cacheEntries().find((entry) => entry.tool === undefined && entry.result === undefined);

    assert.ok(bare, "an entry without result, args or hits maps to its defaults");
    assert.equal(bare.args, undefined, "absent args report as undefined");
    assert.equal(bare.hits, 0, "absent hits count as zero");
    assert.equal(bare.tokens, Math.ceil(JSON.stringify({}).length / 4), "an absent result tokenizes as empty");
  } finally {
    cacheState.store.delete(key);
  }
});

test("flush writes the gzipped file and tolerates an unwritable state", () => {
  const key = cacheKey("rule_tool", { prompt: "persist" });
  cacheSet(key, { content: [{ type: "text", text: "keep" }] }, {});
  flush();

  const where = join(stateDir, "tool-cache.json.gz");
  assert.ok(existsSync(where), "the persisted file lands in the state dir");

  writeFileSync(join(stateDir, "blocker"), "iamafile", "utf8");
  process.env.RULE_MCP_STATE_DIR = join(stateDir, "blocker", "deep");
  cacheSet(cacheKey("rule_tool", { prompt: "again" }), { content: [] }, {});
  flush();
  delete process.env.RULE_MCP_STATE_DIR;
});
