/**
 * @module test/telemetry-stats.test
 *
 * Reading telemetry back: percentiles, the aggregate, and the two renderers.
 * The measured/estimated split is the rule that shapes the whole output - an
 * estimate is always rendered as its own number with a tilde, never added to
 * the measured total.
 */

import test from "node:test";
import assert from "node:assert/strict";

const { aggregate, percentile, renderFlight, renderStats } = await import("../../../../../src/core/telemetry/stats/index.js");

test("percentile is nearest-rank over a sorted copy", () => {
  assert.equal(percentile([], 0.5), 0);
  assert.equal(percentile([3, 1, 2], 0), 1);
  assert.equal(percentile([3, 1, 2], 0.5), 2);
  assert.equal(percentile([3, 1, 2], 1), 3);
  assert.equal(percentile([1, 2, 3, 4], 0.95), 4);
});

test("aggregate keeps measured savings separate from the routing estimate", () => {
  const events = [
    {
      tool: "pix_tool",
      durationMs: 10,
      saved: { caveman: 40 },
      cacheHit: true,
      cacheTier: "exact",
      ok: true,
      ts: 1,
      session: "s1",
    },
    { tool: "pix_tool", durationMs: 20, estimatedRouting: 500, ok: false, ts: 2, session: "s1" },
  ];
  const stats = aggregate(events);

  assert.equal(stats.calls, 2);
  assert.equal(stats.errors, 1);
  assert.equal(stats.cacheHits, 1);
  assert.equal(stats.savedTokens, 40);
  assert.deepEqual(stats.savedBySource, { caveman: 40 });
  assert.equal(stats.estimatedTokens, 500);
  assert.equal(stats.latencyP50, 10);
  assert.equal(stats.latencyP95, 20);
});

test("renderStats never merges the estimate into the measured total", () => {
  const stats = aggregate([
    { tool: "pix_tool", durationMs: 5, saved: { caveman: 10 }, estimatedRouting: 900, ok: true, ts: 1, session: "s" },
  ]);
  const out = renderStats(stats);

  assert.ok(!out.includes("910"), "the estimate must not be added to the measured total");
  assert.match(out, /~900/, "the estimate is rendered alone, with a tilde");
  assert.match(out, /~10/, "the measured saving is rendered with a tilde");
  assert.ok(out.indexOf("Measured saved") < out.indexOf("Routing estimate"));
});

test("renderFlight carries the modeled-estimate sentence with its number", () => {
  const flight = {
    session: { id: "abc", events: [] },
    exportedAt: "2026-01-01T00:00:00.000Z",
    redacted: true,
    kpi: {
      calls: { total: 1, tools: 1, resources: 0, distinctTools: 1, errorRate: 0 },
      latency: { p50: 1, p95: 2 },
      mcp: { resultTokens: 10, argsTokens: 2 },
      tokens: { measuredSaved: 3, savedBySource: { caveman: 3 }, estimatedRouting: 400 },
      guardrails: { failures: 0, byRule: {} },
      cache: { hits: 0, hitRate: 0 },
      routing: {},
      productivity: {},
    },
  };
  const out = renderFlight(flight);

  assert.match(out, /# rule flight: abc/, "the renderer brands its output");
  assert.match(out, /Redacted export/, "a redacted flight says so up front");
  assert.ok(
    out.indexOf("~400") < out.indexOf("is modeled, not measured"),
    "the estimate sentence sits beside its number",
  );
});
