

/**
 * @module core/decision/runtime
 *
 * The one decision supervisor a server process keeps for its lifetime.
 *
 * The model is expensive to load and cheap to ask once resident, so the
 * supervisor is cached and the router's own load-on-first-request path does the
 * warm-up. An unset or unknown model id leaves the feature off: the caller gets
 * null and BM25 answers, with no socket opened.
 */

import { createDecisionClient, DEFAULT_TIMEOUT_MS } from "./_client.js";
import { resolveDecisionModel } from "./_registry.js";
import { createSupervisor } from "./_supervisor.js";

let cached = null;

/**
 * The runtime for the configured model, or null when the feature is off.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ model: object, supervisor: ReturnType<typeof createSupervisor> } | null}
 */
export function decisionRuntime(env = process.env) {
  const model = resolveDecisionModel(env.RULE_MCP_DECISION_MODEL);

  if (!model) {
    return null;
  }

  if (cached?.model.id === model.id) {
    return cached;
  }

  const client = createDecisionClient({
    baseUrl: env.RULE_MCP_DECISION_URL,
    timeoutMs: Number(env.RULE_MCP_DECISION_TIMEOUT ?? DEFAULT_TIMEOUT_MS),
  });

  cached = { model, supervisor: createSupervisor({ client, model: model.id }) };

  return cached;
}

/** Drop the cached supervisor; the next call builds one from the current env. */
export function resetDecisionRuntime() {
  cached = null;
}
