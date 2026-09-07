/** The persistent tier: namespace mismatch, corrupt files, legacy entries. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gzipSync } from "node:zlib";

const stateDir = mkdtempSync(join(tmpdir(), "rule-toolcache-persist-"));
process.env.RULE_MCP_STATE_DIR = stateDir;
delete process.env.RULE_MCP_NO_CACHE;

import { namespace } from "../_config.js";
const { cacheFile, cacheGet, cacheKey, cacheSet } = await import("../index.js");

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
});

function seedDisk(payload) {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(cacheFile(), gzipSync(Buffer.from(JSON.stringify(payload))));
}

test("a cache file from another namespace is ignored", () => {
  seedDisk({ namespace: "some-other-namespace", version: 3, entries: { k: { result: { content: [] } } } });

  assert.equal(cacheGet(cacheKey("pix_tool", { prompt: "n" })), undefined, "a foreign namespace entry never loads");
});

test("a corrupt cache file is non-fatal", () => {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(cacheFile(), "this is not gzip");

  assert.equal(cacheGet("anything"), undefined, "garbage reads as empty");
});

test("legacy entries without a result and request-id carriers are dropped", () => {
  seedDisk({
    namespace: namespace(),
    entries: {
      legacy: { value: 42 },
      withRequest: { result: { _meta: { pixEnforcement: { requestId: "abc" } }, content: [] } },
      fine: { result: { content: [{ type: "text", text: "loaded" }] } },
    },
  });

  // cacheGet by key returns the stored result; the legacy/request entries are gone.
  const key = "fine";
  const hit = cacheGet(key);
  assert.equal(hit?.content?.[0]?.text, "loaded", "a valid entry loads from disk");
  assert.equal(cacheGet("legacy"), undefined, "a legacy entry never loads");
  assert.equal(cacheGet("withRequest"), undefined, "a request-id entry never loads");
});