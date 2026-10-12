

/**
 * The Nyx similarity tier (L2): embedding similarity gated by decision labels.
 *
 * L1 canonicalization answers rephrasings that differ in punctuation or order.
 * A different phrasing is a different key, and the similarity tier was rejected
 * once because similarity alone replays the wrong answer. The gate here is the
 * missing half: a candidate must also carry the same Nyx decision labels
 * (`cacheGroup`) as the live query. Similarity proposes, labels dispose.
 *
 * The tier is opt-in (`RULE_MCP_NYX_CACHE=1`) and never runs without
 * Nyx: every failure is a miss, never an error.
 */
import { cacheEnabled } from "./_config.js";
import { NON_CACHEABLE } from "./_state.js";
import { cacheGet } from "./_entries.js";
import { backfillCall } from "./_replay.js";
import { entriesStore } from "./_persistence.js";
import { annotateMissing, promptOf } from "./_nyx-annotate.js";
import { loadNyxAdapter } from "../../nyx/index.js";

/**
 * The tier is opt-in: `RULE_MCP_NYX_CACHE=1`. It stays off by default
 * because the safe threshold is a measured value (0.97 on the routing corpus
 * with the local embedder) and a config left at the default 0.92 replays the
 * wrong route. Re-measure with `pnpm report:nyx-similarity` before enabling.
 *
 * @returns {boolean}
 */
export function nyxTierEnabled() {
  return cacheEnabled() && process.env.RULE_MCP_NYX_CACHE === "1";
}

/**
 * L2 lookup: same tool, similar prompt, equal decision labels.
 * Returns undefined on miss, or when Nyx is absent, disabled or uncertain.
 *
 * @param {string} toolName
 * @param {object} args
 * @returns {Promise<{ result: object, tier: "similar" }|undefined>}
 */
export async function cacheLookupSemantic(toolName, args) {
  if (!nyxTierEnabled() || NON_CACHEABLE.has(toolName)) {
    return;
  }

  const prompt = promptOf(toolName, args);

  if (!prompt) {
    return;
  }

  const adapter = await loadNyxAdapter();

  if (!adapter?.embed) {
    return;
  }

  try {
    await annotateMissing(adapter, toolName);

    // Most recently used first: the LRU order is the store's insertion order.
    const candidates = [...entriesStore().entries()].toReversed();

    for (const [key, entry] of candidates) {
      if (entry.tool !== toolName || !entry.nyx?.embedding) {
        continue;
      }

      const storedText = promptOf(toolName, entry.args);

      if (!storedText) {
        continue;
      }

      const verdict = await adapter.shouldReplay({
        query: prompt,
        entry: { text: storedText, cacheGroup: entry.nyx.cacheGroup, embedding: entry.nyx.embedding },
      });

      if (!verdict.replay) {
        continue;
      }

      const result = cacheGet(key);

      if (!result) {
        continue;
      }

      backfillCall(key, toolName, args);

      return { result, tier: "similar" };
    }
  } catch {
    // A similarity tier that can fail the call it was meant to speed up is
    // worse than no tier: every error is a miss.
    return;
  }
}
