/** The deterministic core: cached under its own key, receipt-free, and actually consulted. */
import { test } from "node:test";
import assert from "node:assert/strict";

import { ARGUMENTS, CLEAN, GATEWAY_CORE_TOOL, answerOf, cacheClear, cacheGet, cacheKey, cacheSet, callTool, gatewayCoreArguments, textOf } from "./_receipt.fixture.mjs";

test("the deterministic core is cached under its own key", async () => {
  cacheClear();
  const first = await callTool("rule_tool_gateway", ARGUMENTS);
  assert.equal(answerOf(first).checkResult.allPass, true, "fixture must pass guardrails, or no receipt is issued");

  const stored = cacheGet(cacheKey(GATEWAY_CORE_TOOL, gatewayCoreArguments(ARGUMENTS)));
  assert.ok(stored, "the gateway core is not in the cache");
  assert.ok(stored.effectiveRoute?.startsWith("rule-mcp-"), "the cached core carries the route");
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
  cacheSet(key, { ...stored, effectiveRoute: "rule-mcp-poisoned-marker" });

  const second = await callTool("rule_tool_gateway", ARGUMENTS);
  assert.equal(answerOf(second).route, "rule-mcp-poisoned-marker", "the core cache was not consulted");
});

test("a hit and a miss render the same answer apart from the receipt", async () => {
  cacheClear();
  const miss = await callTool("rule_tool_gateway", ARGUMENTS);
  const hit = await callTool("rule_tool_gateway", ARGUMENTS);

  const withoutReceipt = (result) => textOf(result).replaceAll(/`[a-f0-9]{64}`/g, "`<receipt>`");
  assert.equal(withoutReceipt(hit), withoutReceipt(miss), "a replayed core must render the same prose");

  const stripReceipt = (answer) => ({ ...answer, receipt: undefined });
  assert.deepEqual(stripReceipt(answerOf(hit)), stripReceipt(answerOf(miss)), "a replayed core must render the same JSON");
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
