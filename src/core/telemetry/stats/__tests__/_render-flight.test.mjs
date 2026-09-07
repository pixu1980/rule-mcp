/** The flight renderer and the a11y report evaluator. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { renderFlight } from "../_render-flight.js";
import { evaluate, BLOCKING } from "../../../../tools/a11y/_evaluate.js";

const GENERIC = (overrides = {}) => ({
  session: { id: "s-1" },
  exportedAt: 1_760_000_000_000,
  sessions: [],
  kpi: {
    calls: { total: 5, tools: 4, resources: 1, distinctTools: 3, errorRate: 0.1, latency: { p50: 12, p95: 20 } },
    mcp: { resultTokens: 100, resultBytes: 200, argsTokens: 300, avgResultTokens: 20, shareOfLlmTokens: 0.5, costUsd: 1.2 },
    tokens: { measuredSaved: 1000, savedBySource: { caveman: 600, cache: 400 }, cavemanRatio: 0.6, reminderOverhead: 0, estimatedRouting: 5000 },
    cache: { hits: 3, hitRate: 0.6, replayedTokens: 90 },
    guardrails: { failures: 1, byRule: {} },
    productivity: { activeMs: 1_800_000, avgPerCallMs: 120 },
    ...overrides,
  },
});

test("renderFlight renders the tables, the redaction note and the model sentence", () => {
  const out = renderFlight(GENERIC());
  assert.match(out, /# rule flight: s-1/, "the flight name renders");
  assert.doesNotMatch(out, /Redacted export/, "a normal flight has no redaction note");
  assert.match(out, /## MCP token footprint/, "the footprint block renders");
  assert.match(out, /estimatedRouting|Routing estimate/, "the routing estimate renders");
  assert.match(out, /modeled, not measured/, "the model caveat is always present");
  assert.match(out, /Caveman compression/, "the savings table renders");
});

test("renderFlight renders the redacted variant and absent kpi defensively", () => {
  const redacted = renderFlight({ ...GENERIC(), redacted: true });
  assert.match(redacted, /Redacted export/, "the redaction note renders");

  const bare = renderFlight({});
  assert.match(bare, /unknown/, "a flight without an id degrades");
});

test("evaluate validates the scope, the results and the conformance claim", () => {
  assert.throws(() => evaluate({}), /scope/, "a missing scope throws");
  assert.throws(() => evaluate({ scope: { title: "t", url: "u" }, results: [{ criterion: "1.1.x", outcome: "passed" }] }), /Unknown WCAG criterion/, "an unknown criterion throws");
  assert.throws(() => evaluate({ scope: { title: "t", url: "u" }, results: [{ criterion: "1.1.1", outcome: "maybe" }] }), /Unknown outcome/, "an unknown outcome throws");
  assert.throws(() => evaluate({ scope: { title: "t", url: "u" }, results: [{ criterion: "1.4.9", outcome: "passed" }] }), /outside a level AA/, "a level AAA criterion outside target throws");
});

test("evaluate counts outcomes and settles the conformance verdict", () => {
  const result = evaluate({
    scope: { title: "App", url: "http://x", level: "A" },
    results: [
      { criterion: "1.1.1", outcome: "passed", note: "yep" },
      { criterion: "1.3.1", outcome: "failed" },
      { criterion: "1.4.3", outcome: "cantTell" },
    ],
  });

  assert.equal(result.conforms, false, "any blocking outcome breaks conformance");
  assert.equal(result.counts.passed, 1, "the passed count is right");
  assert.equal(result.counts.failed, 1, "the failed count is right");
  assert.equal(result.counts.cantTell, 1, "the cantTell count is right");
  assert.ok(result.counts.untested > 0, "the level-A target has untested criteria");
  assert.deepEqual(result.seen.get("1.1.1").criterion, "1.1.1", "the result dictionary keeps entries");
});