

/**
 * @module core/decision/lifecycle
 *
 * Load, wait for and unload one model.
 *
 * The router answers a load before the child process is ready, so the only
 * honest completion signal is `GET /models` reporting the state the caller
 * asked for. A slot error is retried once; a model that is already running is
 * waited for instead of loaded twice.
 */

import { DecisionSupervisorError } from "./_errors.js";

/** How long a settled state is awaited, in milliseconds. */
export const WAIT_TIMEOUT_MS = 10_000;

/** Delay before the single slot retry, in milliseconds. */
export const RETRY_DELAY_MS = 100;

/** Poll interval while a state is not settled, in milliseconds. */
export const POLL_MS = 100;

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {{
 *   client: {
 *     listModels: () => Promise<any>,
 *     loadModel: (model: string) => Promise<any>,
 *     unloadModel: (model: string) => Promise<any>,
 *   },
 *   model: string,
 *   waitTimeoutMs?: number,
 *   pollMs?: number,
 *   retryDelayMs?: number,
 *   sleep?: (ms: number) => Promise<void>,
 * }} options
 */
export function createLifecycle({ client, model, waitTimeoutMs = WAIT_TIMEOUT_MS, pollMs = POLL_MS, retryDelayMs = RETRY_DELAY_MS, sleep = defaultSleep }) {
  let state = "unknown";

  async function readState() {
    try {
      const models = await client.listModels();
      const card = (Array.isArray(models) ? models : []).find((entry) => entry.id === model);

      return card?.status?.value;
    } catch (error) {
      throw new DecisionSupervisorError(`decision status failed: ${error.message}`, { cause: error, code: "status" });
    }
  }

  async function waitFor(wanted, started) {
    for (;;) {
      const current = await readState();
      const settled = wanted === "unloaded" ? current === "unloaded" || current === undefined : current === "loaded";

      if (settled) {
        state = wanted;

        return;
      }

      if (performance.now() - started > waitTimeoutMs) {
        throw new DecisionSupervisorError(`${model} stayed ${current ?? "gone"}, waiting for ${wanted}`, { code: "timeout" });
      }

      await sleep(pollMs);
    }
  }

  async function loadOnce() {
    try {
      await client.loadModel(model);

      return;
    } catch (error) {
      if (/already running/u.test(error.message)) {
        return;
      }

      if (!/model limit reached/u.test(error.message)) {
        throw new DecisionSupervisorError(`decision load failed: ${error.message}`, { cause: error, code: "load" });
      }
    }

    await sleep(retryDelayMs);

    try {
      await client.loadModel(model);
    } catch (error) {
      throw new DecisionSupervisorError(`decision load failed after one retry: ${error.message}`, { cause: error, code: "load" });
    }
  }

  async function ensureLoaded() {
    const started = performance.now();
    const current = await readState();
    state = current ?? "absent";

    if (current === "loaded") {
      return { state, ms: 0 };
    }

    if (current !== "loading") {
      await loadOnce();
    }

    await waitFor("loaded", started);

    return { state, ms: performance.now() - started };
  }

  async function unload() {
    const started = performance.now();
    const current = await readState();

    if (current === undefined || current === "unloaded") {
      state = "unloaded";

      return { state, ms: 0 };
    }

    try {
      await client.unloadModel(model);
    } catch (error) {
      if (!/not running/u.test(error.message)) {
        throw new DecisionSupervisorError(`decision unload failed: ${error.message}`, { cause: error, code: "unload" });
      }
    }

    await waitFor("unloaded", started);

    return { state, ms: performance.now() - started };
  }

  return {
    get state() {
      return state;
    },
    set state(value) {
      state = value;
    },
    ensureLoaded,
    unload,
  };
}
