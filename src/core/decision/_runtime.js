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
import { detectLanguage } from "./_language.js";
import { modelFits, modelForLanguage, resolveDecisionModel } from "./_registry.js";
import { createSupervisor } from "./_supervisor.js";

let cached = null;

/**
 * The model this prompt would use, or null when the feature is off.
 *
 * Reads the same environment as the runtime, so a caller can consult the answer
 * cache before paying for a supervisor. `auto` selects by the prompt's language;
 * an explicit id or alias still wins, and a model whose context cannot hold its
 * shortlist is refused.
 *
 * @param {string} prompt
 * @param {Record<string, string | undefined>} [env]
 * @returns {object | null}
 */
export function resolveRuntimeModel(prompt, env = process.env) {
  const requested = env.RULE_MCP_DECISION_MODEL;
  const model = requested === "auto" ? modelForLanguage(detectLanguage(prompt)) : resolveDecisionModel(requested);

  return model && modelFits(model, model.shortlist) ? model : null;
}

/**
 * The runtime for the configured model, or null when the feature is off.
 *
 * Switching models unloads the previous one first so a single-slot router never
 * carries two models.
 *
 * @param {string} prompt
 * @param {Record<string, string | undefined>} [env]
 * @returns {Promise<{ model: object, supervisor: ReturnType<typeof createSupervisor> } | null>}
 */
export async function decisionRuntime(prompt, env = process.env) {
  const model = resolveRuntimeModel(prompt, env);

  if (!model) {
    return null;
  }

  if (cached?.model.id === model.id) {
    return cached;
  }

  if (cached) {
    await cached.supervisor.shutdown();
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
