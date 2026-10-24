/**
 * @module workers
 *
 * Public surface of the worker layer. Application code imports from here and
 * never touches `Worker` directly.
 *
 * The pool is a lazily created module singleton: one pool per document, shared
 * by every component. Components own cancellation (`AbortSignal`), not
 * lifetime - a component unmount must not tear down a pool other components
 * are still using.
 */

import { WorkerPool } from "./_worker-pool.js";

export { WorkerPool } from "./_worker-pool.js";
export { serializeError, deserializeError } from "./_task-envelope.js";

/** @type {WorkerPool|undefined} */
let pool;

/**
 * Get the shared pool, creating it on first use.
 *
 * Returns undefined outside the browser so the same module can be imported by
 * a server-rendered entry point (Next, Nuxt, Remix, Astro, SvelteKit).
 *
 * @returns {WorkerPool|undefined}
 */
export function getPool() {
  if (typeof Worker === "undefined") {
    return undefined;
  }

  pool ??= new WorkerPool(
    () =>
      new Worker(new URL("./_pool-worker.js", import.meta.url), {
        type: "module",
        name: "rule-mcp-pool",
      }),
  );

  return pool;
}

/**
 * Run a task on the shared pool, falling back to the main thread when workers
 * are unavailable (server render, or a browser that blocked worker creation).
 *
 * @param {string} task - Task name registered in `../tasks/index.js`
 * @param {unknown} payload - Structured-cloneable input
 * @param {{ transfer?: Transferable[], signal?: AbortSignal }} [options]
 * @returns {Promise<unknown>}
 */
export async function runTask(task, payload, options = {}) {
  const active = getPool();

  if (active) {
    return active.run(task, payload, options);
  }

  const { TASKS } = await import("../tasks/index.js");
  const run = TASKS[task];

  if (!run) {
    throw new Error(`Unknown task "${task}"`);
  }

  return run(payload);
}

/** Terminate the shared pool. Call on full teardown, not on component unmount. */
export function disposePool() {
  pool?.dispose();
  pool = undefined;
}
