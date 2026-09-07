/** The cache replay tiers: exact, normalized, freshness and backfill. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const state = mkdtempSync(join(tmpdir(), "rule-replay-"));

test.before(() => {
  process.env.RULE_MCP_STATE_DIR = state;
  delete process.env.RULE_MCP_NO_CACHE;
});

test.after(() => {
  rmSync(state, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
});

const { cacheClear, cacheIsFresh, cacheLookup, cacheStore } = await import("../index.js");
const { skillDigest } = await import("../index.js");

const RESULT = { content: [{ type: "text", text: "a cached answer" }] };

test("cacheLookup answers exact, then normalized on whitespace drift", () => {
  cacheClear();
  cacheStore("pix_tool", { prompt: "center a div" }, RESULT, {});

  const exact = cacheLookup("pix_tool", { prompt: "center a div" });
  assert.equal(exact.tier, "exact", "the exact key answers first");
  assert.equal(exact.result.content[0].text, "a cached answer", "the result is served");

  const normalized = cacheLookup("pix_tool", { prompt: "   center a div   " });
  assert.equal(normalized?.tier, "normalized", "a whitespace variant hits the normalized key");
  cacheClear();
});

test("cacheIsFresh respects the dep digests and cacheIsFresh answers", () => {
  cacheClear();
  cacheStore("pix_tool", { prompt: "fresh ones" }, RESULT, { "rule-frontend-react": skillDigest("rule-frontend-react") });
  assert.equal(cacheIsFresh("pix_tool", { prompt: "fresh ones" }), true, "a live digest keeps the entry fresh");

  cacheStore("pix_tool", { prompt: "stale ones" }, RESULT, { "rule-never-a-skill": "abc" });
  assert.equal(cacheIsFresh("pix_tool", { prompt: "stale ones" }), false, "a moved skill makes the entry stale");
  cacheClear();
});

test("lookup and store disagree on disabled cache", () => {
  process.env.RULE_MCP_NO_CACHE = "1";
  try {
    assert.equal(cacheStore("pix_tool", { prompt: "x" }, RESULT, {}), undefined, "a disabled cache stores nothing");
    assert.equal(cacheLookup("pix_tool", { prompt: "x" }), undefined, "a disabled cache never answers");
  } finally {
    delete process.env.RULE_MCP_NO_CACHE;
  }
});