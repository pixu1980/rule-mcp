/** L2: similarity plus equal labels, and only for allow-listed prompt tools. */
import test from "node:test";
import assert from "node:assert/strict";
import { cacheClear, cacheLookupSemantic, cacheStore, result } from "./_tiers.fixture.mjs";

// The stub adapter is a fixture module: no model, no network. It must be set
// before the first tier lookup, which is the first adapter load.
process.env.RULE_MCP_NYX_MODULE = new URL("../../../../../tests/fixtures/nyx-adapter-stub.mjs", import.meta.url).href;
process.env.RULE_MCP_NYX_CACHE = "1";
delete process.env.RULE_MCP_NO_NYX;

test("a similar prompt with the same labels replays at the similar tier", async () => {
  cacheClear();
  cacheStore("rule_tool", { prompt: "write an adr for the cache" }, result("stored adr"));

  const cached = await cacheLookupSemantic("rule_tool", { prompt: "write an adr for the cache tier" });

  assert.equal(cached?.tier, "similar");
  assert.equal(cached?.result.content[0].text, "stored adr");
});

test("a similar prompt with different labels does not replay", async () => {
  cacheClear();
  cacheStore("rule_tool", { prompt: "write an adr for the cache" }, result("stored adr"));

  assert.equal(await cacheLookupSemantic("rule_tool", { prompt: "write a poem about the sea" }), undefined);
});

test("a tool without an allow-listed prompt field never reaches the tier", async () => {
  cacheClear();
  cacheStore("rule_tool_check", { code: "const x = 1" }, result("checked"));

  assert.equal(await cacheLookupSemantic("rule_tool_check", { code: "const x = 1" }), undefined);
});

test("the tier stays off without RULE_MCP_NYX_CACHE=1", async () => {
  cacheClear();
  cacheStore("rule_tool", { prompt: "write an adr for the cache" }, result("stored adr"));
  delete process.env.RULE_MCP_NYX_CACHE;

  try {
    assert.equal(await cacheLookupSemantic("rule_tool", { prompt: "write an adr for the cache tier" }), undefined);
  } finally {
    process.env.RULE_MCP_NYX_CACHE = "1";
  }
});
