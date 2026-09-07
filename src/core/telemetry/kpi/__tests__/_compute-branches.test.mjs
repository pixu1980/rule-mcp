/**
 * computeKpi's remaining shapes: empty inputs, absent usage, non-numeric
 * timestamps, cost-per-1k spreads, core-token ratios and the reminder gap.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { computeKpi } from "../index.js";

test("empty inputs produce structurally complete zeros", () => {
  const kpi = computeKpi({});

  assert.deepEqual(kpi.calls, { total: 0, tools: 0, resources: 0, distinctTools: 0, errors: 0, errorRate: 0, sessions: 0 });
  assert.equal(kpi.latency.p50, 0);
  assert.equal(kpi.mcp.avgResultTokens, 0);
  assert.deepEqual(kpi.tokens.savedBySource, {});
  assert.equal(kpi.tokens.estimatedRouting, 0);
  assert.equal(kpi.cache.hitRate, 0);
  assert.equal(kpi.tokens.reminderOverhead, 0);
  assert.equal(kpi.productivity.activeMs, 0);
  assert.equal(kpi.productivity.avgPerCallMs, 0);
  assert.equal("shareOfLlmTokens" in kpi.mcp, false, "no llm traffic means no share");
  assert.equal("cavemanRatio" in kpi.tokens, false, "no core tokens means no ratio");
});

test("usage without cost and a single timestamp fill the undefined gaps", () => {
  const kpi = computeKpi({
    events: [{ ts: "not-a-number", durationMs: 5, tool: "pix_tool", saved: { caveman: "many" } }],
    usage: { input: 100, output: 50, cacheRead: 25, cacheWrite: 5 },
  });

  assert.equal(kpi.calls.total, 1);
  assert.equal(kpi.productivity.activeMs, 0, "a single timestamp cannot span");
  assert.equal(kpi.mcp.shareOfLlmTokens, 0, "zero result tokens over llm traffic");
  assert.equal("costUsd" in kpi.mcp, false, "no cost deployed means no cost block");
});

test("a cost-bearing usage spreads per-1k and per-prompt costs", () => {
  const project = { lines: { total: 1000 } };
  const kpi = computeKpi({
    events: [
      { ts: 1000, durationMs: 500, tool: "a", resultTokensEst: 200, saved: { a: 10 } },
      { ts: 2000, durationMs: 300, tool: "a", resultTokensEst: 100, cacheHit: true, cacheTier: "lru", coreTokens: 400, saved: { caveman: 10 } },
      { ts: 3000, durationMs: 700, tool: "b", ok: false },
    ],
    usage: { input: 10000, output: 2000, costUsd: 2.4, cacheRead: 100, cacheWrite: 100, userTurns: 4 },
    project,
  });

  assert.ok(kpi.mcp.costUsd > 0, "a cost per token is deployed");
  assert.ok(kpi.mcp.shareOfSessionCost > 0, "the session cost share is ratioed");
  assert.equal(kpi.productivity.linesPerMinute, 1000 / ((3000 - 1000) / 60_000), "lines per active minute");
  assert.equal(kpi.productivity.costPer1kOutput, (2.4 / 2000) * 1000, "cost per 1k output tokens");
  assert.ok(kpi.productivity.costPerPrompt > 0, "cost per prompt is ratioed");
  assert.equal(kpi.tokens.cavemanRatio, 10 / 400, "caveman savings over core tokens");
});

test("a log without reminder tokens falls back to the core-to-final gap", () => {
  const kpi = computeKpi({
    events: [{ ts: 1000, coreTokens: 100, finalTokens: 140, tool: "pix_tool" }],
    usage: { output: 140 },
  });

  assert.equal(kpi.tokens.reminderOverhead, 40, "final tokens minus core tokens");
  assert.equal(kpi.tokens.measuredSaved, 0);
});

test("hit and miss latency percentiles both inform recompute saving", () => {
  const kpi = computeKpi({
    events: [
      { ts: 1000, durationMs: 10, cacheHit: true, tool: "a" },
      { ts: 2000, durationMs: 10, cacheHit: true, tool: "a" },
      { ts: 3000, durationMs: 900, cacheHit: false, tool: "b" },
      { ts: 4000, durationMs: 100, cacheHit: false, tool: "b" },
    ],
  });

  assert.equal(kpi.cache.hitRate, 0.5, "half the calls hit");
  assert.ok(kpi.cache.recomputeSavedMsPerHit > 0, "miss medians above hit medians");
});