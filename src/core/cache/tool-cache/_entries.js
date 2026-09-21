

/** The entry store: get/set with per-entry freshness, clear, release, enumerate. */
import { MAX_MEMORY_ENTRIES } from "./_state.js";
import { cacheEnabled } from "./_config.js";
import { dependenciesHold } from "./_digests.js";
import { entriesStore } from "./_persistence.js";

/**
 * Look up a cached result.
 *
 * @param {string} key, from cacheKey()
 * @returns {object|undefined} the stored result, or undefined on miss
 */
export function cacheGet(key) {
  if (!key || !cacheEnabled()) {
    return;
  }

  const store = entriesStore();
  const hit = store.get(key);

  if (hit === undefined) {
    return;
  }
  // Freshness is per entry, not per namespace: an entry whose skills have moved
  // is evicted on the read that found it, so a stale answer is never served and
  // the space it held is not held twice.
  if (!dependenciesHold(hit.deps)) {
    store.delete(key);

    return;
  }
  // Promote to MRU, and count the reuse: promotion to the catalog is earned by
  // being used, and a counter kept anywhere else would have to be kept in step.
  hit.hits = (hit.hits ?? 0) + 1;
  store.delete(key);
  store.set(key, hit);
  // Return a deep copy so callers can't mutate the cached object.

  return structuredClone(hit.result);
}

/**
 * Keep the memory tier under its ceiling by dropping the entry that was used
 * longest ago: insertion order is the recency order, because a read re-inserts.
 *
 * @param {import("../../../shared/ports/index.js").StorePort} store
 */
function evictOldest(store) {
  if (store.size() <= MAX_MEMORY_ENTRIES) {
    return;
  }

  const oldest = store.entries().next().value?.[0];

  if (oldest !== undefined) {
    store.delete(oldest);
  }
}

/**
 * Store a result. No-ops for non-cacheable keys, disabled cache, or error results.
 *
 * @param {string} key, from cacheKey()
 * @param {object} result, the final MCP tool result
 * @param {object} [deps] skill name -> digest at store time, from dependenciesOf()
 */
export function cacheSet(key, result, deps = {}, call = {}) {
  if (!key || !cacheEnabled() || !result || result.isError) {
    return;
  }

  const store = entriesStore();

  store.set(key, {
    result: structuredClone(result),
    deps: { ...deps },
    // The call that produced this, so `cache verify` and `cache export` can run
    // it again. A hash cannot be re-run, and an entry nobody can re-run is one
    // whose determinism is an assumption rather than a check.
    ...(call.tool !== undefined && { tool: call.tool, args: structuredClone(call.args ?? {}) }),
    hits: 0,
  });
  evictOldest(store);
}

/** Clear both tiers. */
export function cacheClear() {
  entriesStore().clear();
}

/** @returns {number} Entries held in the in-memory tier. */
export function memoryEntryCount() {
  return entriesStore().size();
}

/**
 * Hand the in-memory tier back to the heap without losing a single entry.
 *
 * The persistent tier is written first, then memory is emptied and marked
 * unloaded, so the next lookup reads the file back instead of recomputing. The
 * difference from cacheClear() is the whole point: that one forgets, this one
 * only stops holding.
 *
 * @returns {number} How many entries were released
 */
export function releaseMemory() {
  return entriesStore().release();
}

/**
 * The stored entries, for the report and the tests.
 *
 * Read-only by construction: a deep copy, and no key, because a key is a hash
 * and tells a reader nothing they can act on.
 *
 * @returns {Array<{ deps: object, tokens: number }>}
 */
export function cacheEntries() {
  return [...entriesStore().entries()].map(([, entry]) => ({
    tool: entry.tool,
    args: entry.args === undefined ? undefined : structuredClone(entry.args),
    result: structuredClone(entry.result),
    deps: { ...entry.deps },
    hits: entry.hits ?? 0,
    tokens: Math.ceil(JSON.stringify(entry.result ?? {}).length / 4),
  }));
}
