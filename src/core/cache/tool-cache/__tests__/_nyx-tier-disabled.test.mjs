

/** Without Nyx installed the similar tier is a no-op miss, never an error. */
import test from "node:test";
import assert from "node:assert/strict";
import { cacheClear, cacheLookupSemantic, cacheStore, result } from "./_tiers.fixture.mjs";

// A specifier that cannot resolve: the production case when Nyx is not
// installed. Deterministic even in a checkout where it is.
process.env.RULE_MCP_NYX_MODULE = "nyx-does-not-exist/mcp";
delete process.env.RULE_MCP_NO_NYX;
delete process.env.RULE_MCP_NYX_CACHE;

test("without Nyx the similar tier is a no-op miss", async () => {
  cacheClear();
  cacheStore("pix_tool", { prompt: "write an adr" }, result("stored"));

  assert.equal(await cacheLookupSemantic("pix_tool", { prompt: "write an adr now" }), undefined);
});
