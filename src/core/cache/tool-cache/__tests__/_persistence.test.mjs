

/**
 * The persistent tier: legacy entries and request-id carriers are dropped on load.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gzipSync } from "node:zlib";

import { namespace } from "../_config.js";
const { cacheFile, cacheGet, cacheKey } = await import("../index.js");

const stateDir = mkdtempSync(join(tmpdir(), "rule-mcp-toolcache-persist-"));

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
});

process.env.RULE_MCP_STATE_DIR = stateDir;
delete process.env.RULE_MCP_NO_CACHE;

test("legacy entries without a result and request-id carriers are dropped", () => {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(
    cacheFile(),
    gzipSync(
      Buffer.from(
        JSON.stringify({
          namespace: namespace(),
          version: 3,
          entries: {
            legacy: { value: 42 },
            withRequest: { result: { _meta: { ruleEnforcement: { requestId: "abc" } }, content: [] } },
            fine: { result: { content: [{ type: "text", text: "loaded" }] } },
          },
        }),
      ),
    ),
  );

  assert.equal(cacheGet(cacheKey("rule_tool", { prompt: "legacy" })), undefined, "a legacy entry never loads");
  assert.equal(cacheGet(cacheKey("rule_tool", { prompt: "withRequest" })), undefined, "a request-id entry never loads");
  assert.doesNotThrow(() => cacheGet("fine"), "the loader tolerates the mix");
});
