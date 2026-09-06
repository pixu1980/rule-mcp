/** Replay: tiered lookup, the echo check that gates L1, store-under-every-key, freshness. */
import { cacheState } from "./_state.js";
import { echoesArguments } from "./_echo.js";
import { cacheEnabled } from "./_config.js";
import { dependenciesHold } from "./_digests.js";
import { cacheKey, normalizedKey } from "./_keys.js";
import { cacheGet, cacheSet } from "./_entries.js";
import { ensureLoaded } from "./_persistence.js";

/**
 * Look a call up across the tiers, cheapest first, and say which one answered.
 *
 * @param {string} toolName
 * @param {object} args
 * @returns {{ result: object, tier: "exact"|"normalized" }|undefined}
 */
export function cacheLookup(toolName, args) {
  if (!cacheEnabled()) {
    return;
  }

  const exactKey = cacheKey(toolName, args);
  const exact = cacheGet(exactKey);

  if (exact) {
    backfillCall(exactKey, toolName, args);

    return { result: exact, tier: "exact" };
  }

  const normalizedK = normalizedKey(toolName, args);
  const normalized = cacheGet(normalizedK);

  if (normalized) {
    backfillCall(normalizedK, toolName, args);

    return { result: normalized, tier: "normalized" };
  }
}

/**
 * Teach an older entry which call produced it.
 *
 * Entries written before the format recorded the call cannot be verified or
 * promoted, and a hit never rewrites an entry, so without this they would carry
 * that gap until eviction. A reuse is the one moment the call is known again,
 * so it is filled in there and the entry joins the rest.
 *
 * @param {string} key
 * @param {string} toolName
 * @param {object} args
 */
export function backfillCall(key, toolName, args) {
  const entry = cacheState.memory.get(key);

  if (!entry || entry.tool !== undefined) {
    return;
  }

  entry.tool = toolName;
  entry.args = structuredClone(args ?? {});
  cacheState.isDirty = true;
}

/**
 * Store a result under every key that can retrieve it.
 *
 * Both tiers get the same object, so an L1 hit and an L0 hit are the same answer
 * by construction rather than by agreement. L1 is skipped when the answer quotes
 * the question - see echoesArguments.
 *
 * @param {string} toolName
 * @param {object} args
 * @param {object} result
 * @param {object} [deps] skill name -> digest, from dependenciesOf()
 */
export function cacheStore(toolName, args, result, deps = {}) {
  const call = { tool: toolName, args };
  cacheSet(cacheKey(toolName, args), result, deps, call);

  if (!echoesArguments(toolName, args, result)) {
    cacheSet(normalizedKey(toolName, args), result, deps, call);
  }
}

/**
 * Whether a stored answer is still fresh, without counting a reuse.
 *
 * `cache verify` needs this: reading through `cacheLookup` would count a hit
 * for every entry it checked, and an entry could be promoted to the shared
 * catalog by having been verified rather than by having been used. A tool that
 * changes what it measures is not a measurement.
 *
 * @param {string} toolName
 * @param {object} args
 * @returns {boolean} false when nothing is stored, or what is stored is stale
 */
export function cacheIsFresh(toolName, args) {
  if (!cacheEnabled()) {
    return false;
  }

  ensureLoaded();

  for (const key of [cacheKey(toolName, args), normalizedKey(toolName, args)]) {
    const entry = key ? cacheState.memory.get(key) : undefined;

    if (entry && dependenciesHold(entry.deps)) {
      return true;
    }
  }

  return false;
}
