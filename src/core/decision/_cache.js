/**
 * @module core/decision/cache
 *
 * A deterministic answer cache for the decision layer.
 *
 * The audit proved the endpoint is deterministic: the same state and questions
 * returned the same probabilities to the last digit across runs. The key is a
 * digest of the model id, the prompt and the questions, and the questions carry
 * the shortlist, so a changed candidate set cannot hit an answer computed for
 * another one. `RULE_MCP_NO_CACHE` is the same escape every other cache
 * honors.
 */

import { createHash } from "node:crypto";

const MAX_ENTRIES = 256;
const store = new Map();

/** Whether the cache answers at all, from the server-wide escape. */
export function decisionCacheEnabled(env = process.env) {
  return env.RULE_MCP_NO_CACHE !== "1";
}

/** A digest of the model, the state and the questions (the shortlist is folded in). */
export function cacheKey({ model, state, questions }) {
  return createHash("sha256").update(JSON.stringify({ model, state, questions })).digest("hex");
}

/** The small, bounded store the reranker reads and writes. */
export const decisionCache = {
  key: cacheKey,
  read(key) {
    return decisionCacheEnabled() ? (store.get(key) ?? null) : null;
  },
  write(key, value) {
    if (!decisionCacheEnabled()) {
      return;
    }

    if (!store.has(key) && store.size >= MAX_ENTRIES) {
      store.delete(store.keys().next().value);
    }

    store.set(key, value);
  },
  clear() {
    store.clear();
  },
};

/** Drop every entry; the next call asks the model again. */
export function clearDecisionCache() {
  store.clear();
}
