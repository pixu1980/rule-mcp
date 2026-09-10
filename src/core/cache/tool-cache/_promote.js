

/** Promotion to the shared catalog: hit threshold, priming, the promotable set. */
import { cacheState } from "./_state.js";
import { cacheEnabled } from "./_config.js";
import { cacheKey, stableStringify } from "./_keys.js";
import { cacheSet, cacheEntries } from "./_entries.js";
import { ensureLoaded } from "./_persistence.js";

/**
 * Reuses an entry needs before it is a candidate for the shared catalog.
 *
 * Three, because once is an accident and twice is a coincidence. The number is
 * here rather than in the catalog module because the counter lives here.
 */
export const MIN_HITS = 3;

/**
 * Store a result only if nothing is stored under that key yet.
 *
 * This is how an inherited answer enters: the catalog is a floor of shared
 * results, never an override of what this machine computed. Priming happens
 * once at startup, before any work, so "already stored" means a local entry
 * that survived from a previous run.
 *
 * @param {string} toolName
 * @param {object} args
 * @param {object} result
 * @param {object} [deps]
 * @returns {boolean} whether it was stored
 */
export function cachePrime(toolName, args, result, deps = {}) {
  if (!cacheEnabled()) {
    return false;
  }

  const key = cacheKey(toolName, args);

  if (!key) {
    return false;
  }

  ensureLoaded();

  if (cacheState.memory.has(key)) {
    return false;
  }

  cacheSet(key, result, deps, { tool: toolName, args });

  return true;
}

/**
 * The entries reused often enough to be worth sharing, one per distinct call.
 *
 * An entry is stored under two keys, so the same call appears twice with the
 * hits split between the tier that answered it. They are merged here: the call
 * is what is promoted, not the key.
 *
 * @param {number} [minHits]
 * @returns {Array<{ tool: string, args: object, result: object, deps: object, hits: number }>}
 */
export function promotableEntries(minHits = MIN_HITS) {
  const byCall = new Map();

  for (const entry of cacheEntries()) {
    if (entry.tool === undefined) {
      continue;
    }

    const identity = `${entry.tool}\u0000${stableStringify(entry.args ?? {})}`;
    const merged = byCall.get(identity);

    if (merged) {
      merged.hits += entry.hits;
    } else {
      byCall.set(identity, { ...entry, hits: entry.hits });
    }
  }

  return [...byCall.values()].filter((entry) => entry.hits >= minHits);
}
