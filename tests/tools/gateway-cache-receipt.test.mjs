/**
 * @module test/gateway-cache-receipt.test
 *
 * The gateway split: the deterministic half (route, evidence, guardrail
 * verdict) is cached, the receipt never is.
 *
 * This is the one cache change with a security surface, so the receipt tests
 * come first and are the gate: if a replayed core could hand back a replayed
 * receipt, the split does not ship. What is asserted here is that a cache hit
 * mints a token bound to the content passed on THIS call, with an expiry
 * measured from the current clock rather than the stored one.
 */

import { test, before, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-gateway-core-"));
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
// This suite runs the clock backwards to 2023 to test receipt expiry, and the
// recorder is project-scoped, so leaving it on would write 2023-dated events
// into THIS repository's own log and skew every export taken from it.
process.env.RULE_MCP_NO_TELEMETRY = "1";
delete process.env.RULE_MCP_NO_CACHE;

const { loadAllSkills } = await import("../../src/core/skills/index.js");
const { callTool } = await import("../../src/tools/router/index.js");
const { cacheKey, cacheGet, cacheSet, cacheClear } = await import("../../src/core/cache/tool-cache/index.js");
const { GATEWAY_CORE_TOOL, gatewayCoreArguments, validateApply } = await import("../../src/tools/gateway/index.js");

/** Receipt lifetime, mirrored from the module under test. */
const TTL = 300_000;

/** A file that passes every guardrail for the routed skill, so a receipt is issued. */
const CLEAN = `/**
 * Sum two numbers.
 *
 * @param {number} a - First addend.
 * @param {number} b - Second addend.
 * @returns {number} The sum.
 */
export function sum(a, b) {
  const total = a + b;

  return total;
}
`;

const ARGUMENTS = {
  prompt: "add a pure utility function that sums two numbers",
  framework: "express",
  files: [{ path: "src/sum.js", content: CLEAN }],
};

/** The JSON block the gateway appends after the prose. */
const answerOf = (result) => JSON.parse(result.content[1].text.replaceAll(/```json\n?|```/g, ""));
const textOf = (result) => result.content[0].text;

before(async () => {
  await loadAllSkills();
});

test("the deterministic core is cached under its own key", async () => {
  cacheClear();
  const first = await callTool("rule_tool_gateway", ARGUMENTS);
  assert.equal(answerOf(first).checkResult.allPass, true, "fixture must pass guardrails, or no receipt is issued");

  const stored = cacheGet(cacheKey(GATEWAY_CORE_TOOL, gatewayCoreArguments(ARGUMENTS)));
  assert.ok(stored, "the gateway core is not in the cache");
  assert.ok(stored.effectiveRoute?.startsWith("rule-"), "the cached core carries the route");
  assert.ok(stored.evidence?.length > 0, "the cached core carries the evidence");
  assert.equal(stored.checkResult.allPass, true, "the cached core carries the guardrail verdict");
});

test("the cached core carries no receipt", async () => {
  cacheClear();
  await callTool("rule_tool_gateway", ARGUMENTS);
  const stored = cacheGet(cacheKey(GATEWAY_CORE_TOOL, gatewayCoreArguments(ARGUMENTS)));

  assert.ok(stored, "no core entry to inspect");
  assert.equal("receipt" in stored, false, "the core must not carry a receipt field");
  const serialized = JSON.stringify(stored);
  assert.equal(/[a-f0-9]{64}/.test(serialized), false, "the core must not carry anything shaped like a receipt token");
  assert.equal(/Receipt:/.test(serialized), false, "the core must not carry the receipt line");
});

test("the second call is answered from the core cache", async () => {
  cacheClear();
  await callTool("rule_tool_gateway", ARGUMENTS);

  // Poison the stored core. If the second call reads it, the poisoned route
  // reaches the output; if it recomputes, it does not.
  const key = cacheKey(GATEWAY_CORE_TOOL, gatewayCoreArguments(ARGUMENTS));
  const stored = cacheGet(key);
  cacheSet(key, { ...stored, effectiveRoute: "rule-poisoned-marker" });

  const second = await callTool("rule_tool_gateway", ARGUMENTS);
  assert.equal(answerOf(second).route, "rule-poisoned-marker", "the core cache was not consulted");
});

test("a cache hit mints a fresh receipt, with a fresh expiry, bound to this call", async (t) => {
  cacheClear();
  const T0 = 1_700_000_000_000;
  mock.timers.enable({ apis: ["Date"], now: T0 });
  t.after(() => mock.timers.reset());

  const first = answerOf(await callTool("rule_tool_gateway", ARGUMENTS));
  assert.ok(first.receipt, "the first call must issue a receipt");

  // Four minutes later, inside the first receipt's lifetime: the core is a hit.
  const later = T0 + 240_000;
  mock.timers.setTime(later);
  const second = answerOf(await callTool("rule_tool_gateway", ARGUMENTS));
  assert.ok(second.receipt, "a cache hit must still issue a receipt");
  assert.equal(
    validateApply(second.receipt, ARGUMENTS.files, later).valid,
    true,
    "the replayed call's receipt must be usable now",
  );

  // Past the first receipt's expiry, inside the second's. A replayed token
  // would have died with the first one.
  const afterFirstExpiry = T0 + TTL + 1000;
  assert.equal(
    validateApply(first.receipt, ARGUMENTS.files, afterFirstExpiry).valid,
    false,
    "the first receipt must expire on its own schedule",
  );
  assert.equal(
    validateApply(second.receipt, ARGUMENTS.files, afterFirstExpiry).valid,
    true,
    "the second receipt's expiry must be measured from the call that minted it",
  );
});

test("a receipt from a cache hit binds the content passed on that call", async (t) => {
  cacheClear();
  const T0 = 1_700_000_000_000;
  mock.timers.enable({ apis: ["Date"], now: T0 });
  t.after(() => mock.timers.reset());

  const answer = answerOf(await callTool("rule_tool_gateway", ARGUMENTS));
  const tampered = [{ path: "src/sum.js", content: `${CLEAN}\nexport const backdoor = 1;\n` }];

  assert.equal(validateApply(answer.receipt, tampered, T0).valid, false, "a receipt must not authorize other content");
  assert.equal(
    validateApply(answer.receipt, [{ path: "src/elsewhere.js", content: CLEAN }], T0).valid,
    false,
    "a receipt must not authorize another destination",
  );
});

test("a hit and a miss render the same answer apart from the receipt", async () => {
  cacheClear();
  const miss = await callTool("rule_tool_gateway", ARGUMENTS);
  const hit = await callTool("rule_tool_gateway", ARGUMENTS);

  const withoutReceipt = (result) => textOf(result).replaceAll(/`[a-f0-9]{64}`/g, "`<receipt>`");
  assert.equal(withoutReceipt(hit), withoutReceipt(miss), "a replayed core must render the same prose");

  const stripReceipt = (answer) => ({ ...answer, receipt: undefined });
  assert.deepEqual(
    stripReceipt(answerOf(hit)),
    stripReceipt(answerOf(miss)),
    "a replayed core must render the same JSON",
  );
});

test("the core key separates calls that differ in what is checked", () => {
  const other = { ...ARGUMENTS, files: [{ path: "src/sum.js", content: `${CLEAN}\n` }] };
  assert.notEqual(
    cacheKey(GATEWAY_CORE_TOOL, gatewayCoreArguments(ARGUMENTS)),
    cacheKey(GATEWAY_CORE_TOOL, gatewayCoreArguments(other)),
    "different file content must not share a core entry",
  );
  assert.notEqual(
    cacheKey(GATEWAY_CORE_TOOL, gatewayCoreArguments(ARGUMENTS)),
    cacheKey(GATEWAY_CORE_TOOL, gatewayCoreArguments({ ...ARGUMENTS, prompt: "something else entirely" })),
    "a different prompt must not share a core entry",
  );
});
