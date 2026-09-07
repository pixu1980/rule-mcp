/**
 * The numbers this server reports about itself are a product surface. They
 * changed meaning twice in one week upstream (reminder cadence, cavemanRatio
 * divisor), and the only thing standing between a redefinition and a quietly
 * wrong dashboard was a committed fixture. So a fixed event log and the KPI
 * block it is supposed to produce are committed side by side.
 *
 * A failure here is not automatically a bug: a deliberate redefinition is a
 * legitimate reason for these numbers to move. It is a demand for a decision -
 * regenerate the expected block in the same commit as the ADR that changed the
 * definition, or fix what drifted.
 *
 * Ported upstream behavior (hardening 4.5). The export-block test (toFlight)
 * lands with core/telemetry-flight in the telemetry phase.
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const { computeKpi } = await import("../../../../../src/core/telemetry/kpi/index.js");

const fixture = (name) => fileURLToPath(new URL(`../../../../../tests/fixtures/${name}`, import.meta.url));

const EVENTS = readFileSync(fixture("kpi-regression.jsonl"), "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const EXPECTED = JSON.parse(readFileSync(fixture("kpi-regression.expected.json"), "utf8"));

/** The declared inputs that go with the fixture log, held fixed like the log. */
const USAGE = { input: 120_000, output: 8000, costUsd: 1.5, userTurns: 3 };
const PROJECT = { lines: { total: 1200 } };
const NOW = 1_760_000_905_000;

const kpi = computeKpi({ events: EVENTS, usage: USAGE, project: PROJECT, now: NOW });

test("the fixture log still produces the KPI block committed beside it", () => {
  for (const block of ["calls", "tokens", "cache", "guardrails", "mcp"]) {
    assert.deepEqual(
      kpi[block],
      EXPECTED[block],
      `${block} moved. If that was deliberate, regenerate test/fixtures/kpi-regression.expected.json ` +
        "in the same commit as the ADR that redefined it.",
    );
  }
});

test("the measured total is what the sources add up to, and nothing else", () => {
  const sum = Object.values(kpi.tokens.savedBySource).reduce((total, value) => total + value, 0);

  assert.equal(kpi.tokens.measuredSaved, sum, "a measured total that is not its parts is a number nobody can audit");
  assert.ok(
    kpi.tokens.measuredSaved < kpi.tokens.estimatedRouting + kpi.tokens.measuredSaved,
    "the routing estimate has to stay outside the measured total",
  );
  assert.equal(
    Object.keys(kpi.tokens.savedBySource).includes("estimatedRouting"),
    false,
    "the estimate must never be booked as a source of measured saving",
  );
});

test("no reported quantity is negative and no ratio leaves its range", () => {
  const ratios = {
    "calls.errorRate": kpi.calls.errorRate,
    "cache.hitRate": kpi.cache.hitRate,
    "tokens.cavemanRatio": kpi.tokens.cavemanRatio,
    "mcp.shareOfLlmTokens": kpi.mcp.shareOfLlmTokens,
    "mcp.shareOfSessionCost": kpi.mcp.shareOfSessionCost,
  };

  for (const [name, value] of Object.entries(ratios)) {
    assert.ok(value >= 0 && value <= 1, `${name} is ${value}, which is not a share of anything`);
  }

  for (const [name, value] of Object.entries({
    measuredSaved: kpi.tokens.measuredSaved,
    reminderOverhead: kpi.tokens.reminderOverhead,
    coreTokens: kpi.tokens.coreTokens,
    finalTokens: kpi.tokens.finalTokens,
    "guardrails.failures": kpi.guardrails.failures,
  })) {
    assert.ok(value >= 0, `${name} is ${value}: a negative here means a subtraction ran the wrong way`);
  }
});

// The export-block test (flight.version, session timeline) moves with
// core/telemetry-flight's toFlight in the telemetry phase.
