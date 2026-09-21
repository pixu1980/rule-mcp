/**
 * @module workers/worker-pool
 *
 * Fixed-size pool of module workers with a FIFO queue.
 *
 * Why a pool: `new Worker()` pays script fetch, parse, and compile every time.
 * Spawning one per task costs more than the task for anything short of a few
 * hundred milliseconds of work.
 *
 * The pool takes a factory, not a URL, so the
 * `new Worker(new URL("./_pool-worker.js", import.meta.url), { type: "module" })`
 * literal stays at the call site. Vite, webpack, and Rspack only detect a
 * worker when that exact shape appears inline; passing a URL through a wrapper
 * silently produces a worker whose imports were never bundled.
 */

import { poolInternalMethods } from "./_pool-internal.js";
import { poolPublicMethods } from "./_pool-public.js";
import { defaultSize } from "./_pool-size.js";

export class WorkerPool {
  /**
   * @param {() => Worker} createWorker - Factory holding the inline `new Worker(new URL(...))`
   * @param {{ size?: number }} [options]
   */
  constructor(createWorker, options = {}) {
    /** @type {() => Worker} */
    this._createWorker = createWorker;
    /** @type {number} */
    this._size = options.size ?? defaultSize();
    /** @type {Worker[]} - Every live worker, idle or busy */
    this._workers = [];
    /** @type {Worker[]} - Subset of `_workers` waiting for a job */
    this._idle = [];
    /** @type {Map<Worker, object>} - Worker -> job currently running on it */
    this._inFlight = new Map();
    /** @type {object[]} - Jobs waiting for a free worker */
    this._queue = [];
    this._nextId = 1;
    this._isDisposed = false;
  }
}

Object.assign(WorkerPool.prototype, poolPublicMethods, poolInternalMethods);
