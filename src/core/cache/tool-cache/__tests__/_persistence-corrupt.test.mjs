

/**
 * The persistent tier: a corrupt cache file is non-fatal.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const { cacheFile, cacheGet, cacheSet } = await import("../index.js");

const stateDir = mkdtempSync(join(tmpdir(), "rule-mcp-toolcache-garbage-"));

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
});

process.env.RULE_MCP_STATE_DIR = stateDir;
delete process.env.RULE_MCP_NO_CACHE;

test("a corrupt cache file is non-fatal", () => {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(cacheFile(), "this is not gzip");

  assert.equal(cacheGet("anything"), undefined, "garbage reads as empty");

  cacheSet("k", { content: [{ type: "text", text: "fresh" }] }, {});
  assert.doesNotThrow(() => cacheGet("k"), "the store stays usable");
});
