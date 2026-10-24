

/**
 * @module test/tool-cache.test
 *
 * Tests the deterministic result cache: keying, read-only denylist, deep-copy
 * isolation, error exclusion, gzip persistence, the opt-out env var, and
 * end-to-end replay through callTool (handler runs once, second call is served
 * from cache).
 */

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
};

console.log("=== Tool Result Cache Tests ===\n");

import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

// Isolate mutable state to a temp dir BEFORE the cache module resolves paths.
const stateDir = mkdtempSync(join(tmpdir(), "rule-mcp-cache-"));
process.env.RULE_MCP_STATE_DIR = stateDir;
delete process.env.RULE_MCP_NO_CACHE;
process.env.RULE_MCP_DISABLE_AUTO_ADR = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1"; // no self-update banner shifting cached content

const { cacheKey, cacheGet, cacheSet, cacheClear, flush } = await import("../index.js");
const { registerTool, callTool } = await import("../../../../tools/router/index.js");

// ── T1: keying + denylist ──
check("T1 read-only tool gets a key", typeof cacheKey("rule-mcp", { prompt: "x" }) === "string");
check("T1.1 mutation tool rule_tool_apply has no key", cacheKey("rule_tool_apply", {}) === null);
check("T1.2 rule_tool_fix has no key", cacheKey("rule_tool_fix", {}) === null);
check("T1.2.1 rule_tool_init has no key: it reads the graph, the hooks and the manifest", cacheKey("rule_tool_init", {}) === null);
check("T1.3 key stable regardless of arg order", cacheKey("rule-mcp", { a: 1, b: 2 }) === cacheKey("rule-mcp", { b: 2, a: 1 }));

// ── T2: roundtrip + deep-copy isolation ──
const k = cacheKey("rule_tool_search", { query: "grid" });
cacheSet(k, { content: [{ type: "text", text: "hit" }] });
const got = cacheGet(k);
check("T2 roundtrip returns stored result", got?.content?.[0]?.text === "hit");
got.content[0].text = "mutated";
check("T2.1 mutating a returned result does not corrupt cache", cacheGet(k).content[0].text === "hit");

// ── T3: errors are never cached ──
const ek = cacheKey("rule_tool_search", { query: "err" });
cacheSet(ek, { isError: true, content: [{ type: "text", text: "boom" }] });
check("T3 error result not stored", cacheGet(ek) === undefined);

// ── T4: gzip persistence ──
flush();
const file = join(stateDir, "tool-cache.json.gz");
check("T4 persistent gzip file written", existsSync(file));
const disk = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8"));
check("T4.1 persisted payload holds the stored entry", disk.entries[k]?.result?.content?.[0]?.text === "hit");

// ── T5: end-to-end replay through callTool (handler runs once) ──
let calls = 0;
registerTool({
  name: "rule_tool_cache_probe",
  entry: "action",
  description: "test-only cacheable tool",
  handler: async () => {
    calls += 1;
    return { content: [{ type: "text", text: `run ${calls}` }] };
  },
});
const r1 = await callTool("rule_tool_cache_probe", { seed: 1 });
const r2 = await callTool("rule_tool_cache_probe", { seed: 1 });
check("T5 handler ran exactly once for identical calls", calls === 1);
check("T5.1 both calls return the same payload", r1.content[0].text === "run 1" && r2.content[0].text === "run 1");
const r3 = await callTool("rule_tool_cache_probe", { seed: 2 });
check("T5.2 different args recompute", calls === 2 && r3.content[0].text === "run 2");

// ── T6: opt-out disables caching ──
process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1"; // hermetic: no real git ops in tests
check("T6 cacheGet returns undefined when disabled", cacheGet(k) === undefined);
delete process.env.RULE_MCP_NO_CACHE;

// ── T7: clear empties the cache ──
cacheClear();
check("T7 cacheGet miss after clear", cacheGet(k) === undefined);

console.log(`\nResults: ${pass} passed, ${fail} failed`);
setTimeout(() => process.exit(fail > 0 ? 1 : 0), 50);
