/** @module scripts/reports/cache/measure - the passes and the two correctness invariants */

import { CORPUS, cacheClear, cacheEntries, callTool, entryPathOf } from "./_context.mjs";
import { WORKLOAD } from "./_workload.mjs";

/**
 * Run every corpus prompt and tally the tier that answered.
 *
 * @param {(entry: object) => string} promptOf
 * @returns {Promise<object>}
 */
export async function pass(promptOf) {
  const tiers = { exact: 0, normalized: 0, miss: 0 };
  const entries = {};
  for (const entry of CORPUS) {
    const result = await callTool("rule_tool", { prompt: promptOf(entry) });
    const tier = result?._meta?.ruleCache?.tier ?? "miss";
    tiers[tier] += 1;
    const path = entryPathOf("rule_tool");
    entries[path] = (entries[path] ?? 0) + 1;
  }

  return { tiers, entries, calls: CORPUS.length };
}

/**
 * What one skill edit would drop, per skill, without editing anything.
 *
 * An entry survives an edit to skill X exactly when X is not among the
 * dependencies it recorded, so this is a count over the stored entries and not
 * a simulation of a filesystem change.
 *
 * @returns {{ entries: number, worst: string, worstDependents: number, survival: number, unattributed: number }}
 */
export function invalidationCost() {
  const entries = cacheEntries();
  const counts = {};
  let unattributed = 0;
  for (const entry of entries) {
    const names = Object.keys(entry.deps ?? {});
    if (names.length === 0) {
      unattributed += 1;
    }
    for (const name of names) {
      counts[name] = (counts[name] ?? 0) + 1;
    }
  }
  const [worst, worstDependents] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? ["none", 0];

  return {
    entries: entries.length,
    worst,
    worstDependents,
    survival: entries.length > 0 ? 1 - worstDependents / entries.length : 1,
    unattributed,
  };
}

/**
 * Two invariants, checked rather than assumed.
 *
 * Determinism: the same call, computed twice with the cache off, must produce
 * the same text. The whole cache rests on this, and nothing else verifies it.
 *
 * Parity: a cached hit must decorate to the same output as a miss. The one
 * permitted difference is `_meta.ruleCache`, which names the tier that
 * answered and is the reason a hit is debuggable at all.
 *
 * @returns {Promise<{ determinism: string[], parity: string[], checked: number }>}
 */
export async function correctness() {
  const determinism = [];
  const parity = [];

  process.env.RULE_MCP_NO_CACHE = "1";
  const uncached = new Map();
  for (const [tool, arguments_] of WORKLOAD) {
    const first = await callTool(tool, arguments_);
    const second = await callTool(tool, arguments_);
    const a = first?.content?.[0]?.text ?? "";
    const b = second?.content?.[0]?.text ?? "";
    if (a !== b) {
      determinism.push(tool);
    }
    uncached.set(tool, a);
  }
  delete process.env.RULE_MCP_NO_CACHE;

  cacheClear();
  for (const [tool, arguments_] of WORKLOAD) {
    const miss = await callTool(tool, arguments_);
    const hit = await callTool(tool, arguments_);
    if ((hit?.content?.[0]?.text ?? "") !== (miss?.content?.[0]?.text ?? "")) {
      parity.push(tool);
    }
    if (!hit?._meta?.ruleCache?.tier) {
      parity.push(`${tool} (no tier reported)`);
    }
    if ((miss?.content?.[0]?.text ?? "") !== uncached.get(tool)) {
      parity.push(`${tool} (differs with cache off)`);
    }
  }

  return { determinism, parity, checked: WORKLOAD.length };
}
