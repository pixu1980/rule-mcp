

/** Reporting: entry-path classification, per-tier aggregates, the rendered report. */
import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { cacheClear, cacheStore, entryPathOf, result, stateDir } from "./_tiers.fixture.mjs";

const { loadAllSkills } = await import("../../../skills/index.js");
const { bootstrapCoreTools } = await import("../../../../tools/_bootstrap.js");

await loadAllSkills(true);
// The gateway and the apply tool are registered by the startup bootstrap, not
// by the catalog (ARCH-1), so the surface is only complete after both run.
await bootstrapCoreTools();

// ── End to end through callTool ──
test("every call is classified by the path it arrived on", () => {
  assert.equal(entryPathOf("pix_tool"), "router");
  assert.equal(entryPathOf("rule_tool_gateway"), "gateway");
  assert.equal(entryPathOf("rule_tool_frontend_react"), "skill");
  assert.equal(entryPathOf("rule_tool_styleguide_css"), "skill");
  assert.equal(entryPathOf("rule_tool_check"), "action");
  assert.equal(entryPathOf("rule_tool_handon"), "action");
});

// ── Aggregation reports both facets ──

test("the aggregate reports hit rate per tier and calls per entry path", async () => {
  const { aggregate } = await import("../../../telemetry/stats/index.js");
  const stats = aggregate([
    { tool: "pix_tool", cacheHit: false, cacheTier: "miss", entry: "router" },
    { tool: "pix_tool", cacheHit: true, cacheTier: "exact", entry: "router" },
    { tool: "pix_tool", cacheHit: true, cacheTier: "normalized", entry: "router" },
    { tool: "rule_tool_frontend_react", cacheHit: true, cacheTier: "exact", entry: "skill" },
  ]);

  assert.deepEqual(stats.byTier, { miss: 1, exact: 2, normalized: 1 });
  assert.deepEqual(stats.byEntry, { router: 3, skill: 1 });
  assert.equal(stats.cacheHitRate, 0.75);
});

test("the rendered report names the tiers and the entry paths", async () => {
  const { aggregate, renderStats } = await import("../../../telemetry/stats/index.js");
  const text = renderStats(
    aggregate([
      { tool: "pix_tool", cacheHit: true, cacheTier: "normalized", entry: "router" },
      { tool: "rule_tool_frontend_react", cacheHit: false, cacheTier: "miss", entry: "skill" },
    ]),
  );

  assert.match(text, /normalized/);
  assert.match(text, /skill/);
});

// ── The number, held at a floor ──

test("a rephrased corpus mostly replays, and L0 alone cannot do it", async () => {
  const { callTool: call } = await import("../../../../tools/router/index.js");
  const { CORPUS } = await import("../../../../../tests/fixtures/routing-corpus.mjs");

  const rephrase = (prompt) => {
    const words = prompt.trim().split(/\s+/);
    const last = words.at(-1);
    const plural = /[a-z]$/.test(last) && !last.endsWith("s") ? `${last}s` : last;

    return `How do I ${[...words.slice(0, -1), plural].join(" ")}?`;
  };

  const run = async () => {
    cacheClear();
    for (const entry of CORPUS) {
      await call("pix_tool", { prompt: entry.prompt });
    }
    let replayed = 0;
    for (const entry of CORPUS) {
      const result = await call("pix_tool", { prompt: rephrase(entry.prompt) });
      if (result?._meta?.pixCache?.tier) {
        replayed += 1;
      }
    }

    return replayed / CORPUS.length;
  };

  const withL1 = await run();

  process.env.RULE_MCP_CACHE_EXACT_ONLY = "1";
  let withoutL1;
  try {
    withoutL1 = await run();
  } finally {
    delete process.env.RULE_MCP_CACHE_EXACT_ONLY;
  }

  console.log(`  rephrased corpus: ${Math.round(withoutL1 * 100)}% with L0 only, ${Math.round(withL1 * 100)}% with L1`);
  assert.equal(withoutL1, 0, "L0 cannot answer a rephrasing, by construction");
  assert.ok(withL1 >= 0.8, `L1 must replay most of a rephrased corpus, got ${Math.round(withL1 * 100)}%`);
});

// ── L2, and why there is no L2 ──

test("no tier above the normalized key is wired in", async () => {
  // The plan's gate for a similarity tier was that wrong replays must be zero.
  // Measured over 224 rephrasings the normalized key cannot answer, no threshold
  // both replays something and replays it correctly: 0.90 replays nothing, 0.85
  // is 13% wrong, 0.80 is 16% wrong. ADR 056 has the reasoning, and
  // scripts/reports/cache-similarity/index.mjs reproduces the number.
  //
  // This test exists so the absence is deliberate rather than forgotten. If a
  // future tier lands, it changes this assertion and has to bring a report
  // showing a threshold with zero wrong replays and a non-zero hit count.
  const { cacheLookup: lookup } = await import("../index.js");
  const TIERS = new Set(["exact", "normalized"]);
  cacheClear();

  const args = { prompt: "svelte store for shared state" };
  cacheStore("pix_tool", args, result("stored"));

  for (const probe of [args, { prompt: "Svelte stores for shared state?" }]) {
    const tier = lookup("pix_tool", probe)?.tier;
    assert.ok(TIERS.has(tier), `unexpected tier ${tier}: a new tier needs its own report`);
  }

  // A prompt that only overlaps must miss, not approximate.
  assert.equal(lookup("pix_tool", { prompt: "store for state" }), undefined, "partial overlap must miss: replaying it is the wrong replay the report measured");
});

process.on("exit", () => rmSync(stateDir, { recursive: true, force: true }));
