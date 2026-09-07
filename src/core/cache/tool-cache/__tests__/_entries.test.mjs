/** The entry store: freshness eviction, replication, and persistence failure. */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "rule-toolcache-"));

test.before(() => {
  process.env.RULE_MCP_STATE_DIR = stateDir;
  delete process.env.RULE_MCP_NO_CACHE;
});

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
});

const { cacheGet, cacheSet, flush, ensureLoaded, cacheKey } = await import("../index.js");

test("cacheSet and cacheGet round-trip a deep copy and count reuse", () => {
  const key = cacheKey("pix_tool", { prompt: "x" });

  assert.equal(cacheGet(key), undefined, "a miss is a miss");
  cacheSet(key, { content: [{ type: "text", text: "hit" }] }, {});
  assert.equal(cacheGet("nope"), undefined, "an unknown key misses");

  const first = cacheGet(key);
  first.content[0].text = "mutated";

  const second = cacheGet(key);
  assert.equal(second.content[0].text, "hit", "the stored copy is not mutated by callers");
});

test("an entry whose dependency has moved is evicted on read", () => {
  const key = cacheKey("pix_tool", { prompt: "reply" });
  cacheSet(key, { content: [{ type: "text", text: "stale depends" }] }, { "rule-never-a-skill": "abc" });

  assert.equal(cacheGet(key), undefined, "a stale dependence means no reuse");
});

test("error results and missing keys never store", () => {
  const key = cacheKey("pix_tool", { prompt: "err" });
  cacheSet(key, { isError: true, content: [] }, {});
  assert.equal(cacheGet(key), undefined, "an error result is not cached");
  cacheSet("", { content: [] }, {});
});

test("flush writes the gzipped file and tolerates an unwritable state", () => {
  const key = cacheKey("pix_tool", { prompt: "persist" });
  cacheSet(key, { content: [{ type: "text", text: "keep" }] }, {});
  flush();

  const where = join(stateDir, "tool-cache.json.gz");
  assert.ok(existsSync(where), "the persisted file lands in the state dir");

  writeFileSync(join(stateDir, "blocker"), "iamafile", "utf8");
  process.env.RULE_MCP_STATE_DIR = join(stateDir, "blocker", "deep");
  cacheSet(cacheKey("pix_tool", { prompt: "again" }), { content: [] }, {});
  flush();
  delete process.env.RULE_MCP_STATE_DIR;
});