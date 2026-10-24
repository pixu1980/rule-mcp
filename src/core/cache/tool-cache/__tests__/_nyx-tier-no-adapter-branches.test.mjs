

/** Branch coverage: similarity tier with an adapter that has no embed method. */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "rule-nyx-tier-no-adapter-"));

process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NYX_CACHE = "1";
process.env.RULE_MCP_NYX_MODULE = new URL("_nyx-adapter-no-embed.fixture.mjs", import.meta.url).href;
delete process.env.RULE_MCP_NO_NYX;
delete process.env.RULE_MCP_NO_CACHE;

const { cacheClear, cacheLookupSemantic, cacheStore } = await import("../index.js");

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
  delete process.env.RULE_MCP_NYX_CACHE;
  delete process.env.RULE_MCP_NYX_MODULE;
});

test("an adapter without embed is a miss", async () => {
  cacheClear();
  cacheStore("pix_tool", { prompt: "write an adr for the cache" }, { content: [{ type: "text", text: "stored" }] });

  assert.equal(await cacheLookupSemantic("pix_tool", { prompt: "write an adr for the cache tier" }), undefined);
});
