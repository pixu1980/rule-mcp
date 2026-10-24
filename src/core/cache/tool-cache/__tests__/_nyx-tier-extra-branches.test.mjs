/**
 * Branch coverage for cacheLookupSemantic miss loops: no embedding, no stored
 * prompt, stale cacheGet, and the catch-all error path.
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "rule-mcp-nyx-tier-extra-"));

process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NYX_CACHE = "1";
process.env.RULE_MCP_NYX_MODULE = new URL("_nyx-adapter-branch.fixture.mjs", import.meta.url).href;
delete process.env.RULE_MCP_NO_NYX;
delete process.env.RULE_MCP_NO_CACHE;

const { cacheClear, cacheLookupSemantic } = await import("../index.js");
const { nyxTierEnabled } = await import("../_nyx-tier.js");
const { entriesStore } = await import("../_persistence.js");

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
  delete process.env.RULE_MCP_NYX_CACHE;
  delete process.env.RULE_MCP_NYX_MODULE;
});

test("nyxTierEnabled follows the cache and opt-in flags", () => {
  assert.equal(nyxTierEnabled(), true);
  delete process.env.RULE_MCP_NYX_CACHE;
  assert.equal(nyxTierEnabled(), false);
  process.env.RULE_MCP_NYX_CACHE = "1";
  process.env.RULE_MCP_NO_CACHE = "1";
  assert.equal(nyxTierEnabled(), false);
  delete process.env.RULE_MCP_NO_CACHE;
});

test("a non-cacheable tool never reaches the similarity loop", async () => {
  assert.equal(await cacheLookupSemantic("rule_tool_git", { prompt: "status" }), undefined);
});

test("entries without an embedding or without a stored prompt are skipped", async () => {
  cacheClear();
  const store = entriesStore();

  // Blank prompt: annotateMissing skips it, so the loop hits !embedding.
  store.set("no-embed", {
    tool: "rule_tool",
    args: { prompt: " ".repeat(3) },
    result: { content: [{ type: "text", text: "x" }] },
    deps: {},
  });
  // Embedding present but no stored prompt text: the loop hits !storedText.
  store.set("blank-prompt", {
    tool: "rule_tool",
    args: { prompt: " ".repeat(3) },
    result: { content: [{ type: "text", text: "x" }] },
    deps: {},
    nyx: { cacheGroup: "docs|easy|plain", embedding: [1, 0] },
  });
  store.set("other-tool", {
    tool: "rule_tool_check",
    args: { prompt: "write an adr for the cache" },
    result: { content: [{ type: "text", text: "x" }] },
    deps: {},
    nyx: { cacheGroup: "docs|easy|plain", embedding: [1, 0] },
  });

  assert.equal(await cacheLookupSemantic("rule_tool", { prompt: "write an adr for the cache tier" }), undefined);
});

test("a replay verdict with a stale digest is still a miss", async () => {
  cacheClear();
  entriesStore().set("stale", {
    tool: "rule_tool",
    args: { prompt: "write an adr for the cache" },
    result: { content: [{ type: "text", text: "stored" }] },
    deps: { "rule-mcp-does-not-exist": "deadbeefdeadbeef" },
    nyx: { cacheGroup: "docs|easy|plain", embedding: [1, 0] },
  });

  assert.equal(await cacheLookupSemantic("rule_tool", { prompt: "write an adr for the cache tier" }), undefined);
});

test("an adapter throw is a miss, never an error", async () => {
  cacheClear();
  entriesStore().set("ok", {
    tool: "rule_tool",
    args: { prompt: "write an adr for the cache" },
    result: { content: [{ type: "text", text: "stored" }] },
    deps: {},
    nyx: { cacheGroup: "docs|easy|plain", embedding: [1, 0] },
  });

  assert.equal(await cacheLookupSemantic("rule_tool", { prompt: "throw-please write an adr" }), undefined);
});
