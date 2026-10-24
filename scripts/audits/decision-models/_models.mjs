/**
 * @module scripts/audits/decision-models/models
 *
 * Loading and unloading a model through the router API, and waiting for the
 * state the caller asked for.
 *
 * Both `/models/load` and `/models/unload` answer before the model has started
 * or stopped: `GET /models` reports `loading` until the child process is ready,
 * so a reply is not the end of the transition and the status is.
 *
 * With `max_instances 1` the slot frees only once the child process exits, so a
 * load answers `500 model limit reached` for the moment it takes. That is
 * retried, because the caller only cares that the model ends up loaded.
 */

import { call, listModels, TIMEOUT_MS } from "./_client.mjs";

/** How long a load keeps retrying the one instance slot, in milliseconds. */
const LOAD_RETRY_MS = 30_000;

/** The state the router reports for one model, or undefined when it is gone. */
export async function statusOf(model) {
  const card = (await listModels()).find((entry) => entry.id === model);

  return card?.status?.value;
}

/**
 * A 400 that names the state the caller asked for is success, not a failure.
 *
 * @param {() => Promise<{ json: any }>} attempt
 * @param {RegExp} tolerated
 * @returns {Promise<{ json: any }>}
 */
async function orAlreadyThere(attempt, tolerated) {
  return attempt().catch((error) => {
    if (tolerated.test(error.message)) {
      return { json: { success: true } };
    }

    throw error;
  });
}

/**
 * Poll the router until a model reports the state the caller asked for.
 *
 * The status reports `loading` until the child process is ready, so polling is
 * the only way to know that a load or an unload has landed, and the only honest
 * place to stop the clock.
 *
 * @param {string} model
 * @param {"loaded"|"unloaded"} wanted
 * @returns {Promise<void>}
 */
async function waitFor(model, wanted) {
  const started = performance.now();

  for (;;) {
    const state = await statusOf(model);
    const settled = wanted === "unloaded" ? state === "unloaded" || state === undefined : state === "loaded";

    if (settled) {
      return;
    }

    if (performance.now() - started > TIMEOUT_MS) {
      throw new Error(`${model} stayed ${state ?? "gone"}, waiting for ${wanted}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Load a model and wait until the router reports it loaded.
 *
 * `POST /models/load` answers while the model is still `loading`, so a second
 * load answers `400 model is already running`, and a router with one instance
 * slot answers `500 model limit reached` until the previous process has exited.
 * Both are retried for a few seconds rather than reported as a failure, because
 * the caller only cares that the model ends up loaded.
 *
 * @param {string} model
 * @returns {Promise<number>} milliseconds spent loading
 */
export async function load(model) {
  const started = performance.now();
  const giveUp = started + LOAD_RETRY_MS;

  for (;;) {
    try {
      await call("/models/load", { model });
      break;
    } catch (error) {
      if (!/already running|model limit reached/u.test(error.message) || performance.now() > giveUp) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  await waitFor(model, "loaded");

  return performance.now() - started;
}

/**
 * Unload a model and wait until the router has released the instance.
 *
 * A model that is not running is already in the state asked for.
 *
 * @param {string} model
 * @returns {Promise<boolean>}
 */
export async function unload(model) {
  await orAlreadyThere(() => call("/models/unload", { model }), /not running/u);
  await waitFor(model, "unloaded");

  return true;
}
