

/**
 * The persistent tier: a cache file from another namespace is ignored.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gzipSync } from "node:zlib";

const { cacheFile, cacheGet, cacheKey, cacheSet } = await import("../index.js");

const stateDir = mkdtempSync(join(tmpdir(), "rule-mcp-toolcache-ns-"));

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
});

process.env.RULE_MCP_STATE_DIR = stateDir;
delete process.env.RULE_MCP_NO_CACHE;

test("a cache file from another namespace is ignored and replaced", () => {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(cacheFile(), gzipSync(Buffer.from(JSON.stringify({ namespace: "some-other-namespace", version: 3, entries: { k: { result: { content: [] } } } }))));

  assert.equal(cacheGet(cacheKey("rule_tool", { prompt: "n" })), undefined, "a foreign namespace entry never loads");

  cacheSet(cacheKey("rule_tool", { prompt: "mine" }), { content: [{ type: "text", text: "now" }] }, {});
  assert.equal(cacheGet(cacheKey("rule_tool", { prompt: "mine" }))?.content?.[0]?.text, "now", "the current namespace works");
});
