

/**
 * @module core/decision/supervisor
 *
 * The model lifecycle and the breaker for one decision endpoint.
 *
 * The lifecycle owns load, wait and unload. This module owns the call path:
 * three consecutive failures open the breaker, the next call answers from the
 * caller's fallback without opening a socket, and one probe per cooldown is
 * allowed to close it.
 */

import { createBreaker } from "./_breaker.js";
import { DecisionSupervisorError } from "./_errors.js";
import { createLifecycle } from "./_lifecycle.js";

export { DecisionSupervisorError } from "./_errors.js";

/**
 * @param {{
 *   client: {
 *     listModels: () => Promise<any>,
 *     loadModel: (model: string) => Promise<any>,
 *     unloadModel: (model: string) => Promise<any>,
 *     ask: (model: string, prompt: string, questions: object) => Promise<any>,
 *   },
 *   model: string,
 *   waitTimeoutMs?: number,
 *   pollMs?: number,
 *   retryDelayMs?: number,
 *   threshold?: number,
 *   cooldownMs?: number,
 *   now?: () => number,
 *   sleep?: (ms: number) => Promise<void>,
 * }} options
 */
export function createSupervisor(options = {}) {
  const { client, model } = options;

  if (!client || typeof client.listModels !== "function" || typeof client.ask !== "function") {
    throw new TypeError("decision supervisor needs a client");
  }

  if (typeof model !== "string" || model.length === 0) {
    throw new TypeError("decision supervisor needs a model id");
  }

  const breaker = createBreaker({ threshold: options.threshold, cooldownMs: options.cooldownMs, now: options.now });
  const lifecycle = createLifecycle({
    client,
    model,
    waitTimeoutMs: options.waitTimeoutMs,
    pollMs: options.pollMs,
    retryDelayMs: options.retryDelayMs,
    sleep: options.sleep,
  });
  let closing = false;

  async function ask(prompt, questions, { fallback } = {}) {
    if (!breaker.allow()) {
      const error = new DecisionSupervisorError("decision breaker is open", { code: "breaker-open" });

      if (typeof fallback === "function") {
        return { ok: false, reason: "breaker-open", value: await fallback(), error };
      }

      throw error;
    }

    try {
      const answer = await client.ask(model, prompt, questions);
      breaker.success();
      lifecycle.state = "loaded";

      return { ok: true, ...answer };
    } catch (error) {
      breaker.failure();
      throw error;
    }
  }

  async function shutdown() {
    if (closing) {
      return;
    }

    closing = true;

    if (lifecycle.state === "loaded" || lifecycle.state === "loading") {
      await lifecycle.unload().catch(() => {});
    }
  }

  function status() {
    const failures = breaker.failures > 0 ? `, ${breaker.failures} failure(s)` : "";

    return `decision: model ${model} ${lifecycle.state}; breaker ${breaker.state}${failures}`;
  }

  return {
    ensureLoaded: lifecycle.ensureLoaded,
    unload: lifecycle.unload,
    ask,
    shutdown,
    status,
    get breaker() {
      return { state: breaker.state, failures: breaker.failures };
    },
  };
}
