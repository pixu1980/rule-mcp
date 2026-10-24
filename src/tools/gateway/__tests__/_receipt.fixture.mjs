

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

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-mcp-gateway-core-"));
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
// This suite runs the clock backwards to 2023 to test receipt expiry, and the
// recorder is project-scoped, so leaving it on would write 2023-dated events
// into THIS repository's own log and skew every export taken from it.
process.env.RULE_MCP_NO_TELEMETRY = "1";
delete process.env.RULE_MCP_NO_CACHE;

const { loadAllSkills } = await import("../../../core/skills/index.js");

export const { callTool } = await import("../../router/index.js");
export const { cacheKey, cacheGet, cacheSet, cacheClear } = await import("../../../core/cache/tool-cache/index.js");
export const { GATEWAY_CORE_TOOL, gatewayCoreArguments, validateApply } = await import("../index.js");

await loadAllSkills();
// The gateway and the apply tool are registered at startup, not by the catalog.
const { bootstrapCoreTools } = await import("../../_bootstrap.js");
await bootstrapCoreTools();

/** Receipt lifetime, mirrored from the module under test. */
export const TTL = 300_000;

/** A file that passes every guardrail for the routed skill, so a receipt is issued. */
export const CLEAN = `/**
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

export const ARGUMENTS = {
  prompt: "add a pure utility function that sums two numbers",
  framework: "express",
  files: [{ path: "src/sum.js", content: CLEAN }],
};

/** The JSON block the gateway appends after the prose. */
export const answerOf = (result) => JSON.parse(result.content[1].text.replaceAll(/```json\n?|```/g, ""));
export const textOf = (result) => result.content[0].text;
