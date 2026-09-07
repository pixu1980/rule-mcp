/** Storage semantics: both tiers serve the same value, immutably, errors never stored. */
import test from "node:test";
import assert from "node:assert/strict";
import { cacheClear, cacheLookup, cacheStore, result } from "./_tiers.fixture.mjs";

// ── Lookup and store report their tier ──

test("an identical call is an exact hit, a rephrased one is a normalized hit", () => {
  cacheClear();
  const args = { prompt: "svelte store for shared state" };
  cacheStore("pix_tool", args, result("stored"));

  assert.equal(cacheLookup("pix_tool", args)?.tier, "exact");
  assert.equal(cacheLookup("pix_tool", { prompt: "Svelte stores for shared state?" })?.tier, "normalized");
  assert.equal(cacheLookup("pix_tool", { prompt: "postgres index" }), undefined, "a different question misses");
});

test("both tiers return the same stored value", () => {
  cacheClear();
  const args = { prompt: "angular signals" };
  cacheStore("pix_tool", args, result("one answer"));

  assert.deepEqual(cacheLookup("pix_tool", { prompt: "Angular signal!" }).result, cacheLookup("pix_tool", args).result);
});

test("a stored result cannot be mutated through a lookup", () => {
  cacheClear();
  const args = { prompt: "vue composition api" };
  cacheStore("pix_tool", args, result("intact"));
  cacheLookup("pix_tool", args).result.content[0].text = "tampered";

  assert.equal(cacheLookup("pix_tool", args).result.content[0].text, "intact");
});

test("an error result is stored at neither tier", () => {
  cacheClear();
  const args = { prompt: "broken" };
  cacheStore("pix_tool", args, { isError: true, content: [{ type: "text", text: "no" }] });

  assert.equal(cacheLookup("pix_tool", args), undefined);
});

test("the opt-out disables every tier", () => {
  cacheClear();
  const args = { prompt: "react button" };
  cacheStore("pix_tool", args, result("stored"));
  process.env.RULE_MCP_NO_CACHE = "1";
  try {
    assert.equal(cacheLookup("pix_tool", args), undefined);
  } finally {
    delete process.env.RULE_MCP_NO_CACHE;
  }
});
