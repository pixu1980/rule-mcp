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

import { deserializeError } from "./_task-envelope.js";

/** Hard ceiling on pool size. More workers than this stops paying for itself. */
const MAX_WORKERS = 4;

/**
 * Pool size hint: one worker per logical core, minus the core the UI runs on.
 *
 * `navigator.hardwareConcurrency` is a hint, not a promise. Browsers clamp it
 * to resist fingerprinting and it says nothing about current load.
 *
 * @returns {number}
 */
function defaultSize() {
  const cores = globalThis.navigator?.hardwareConcurrency ?? 4;

  return Math.max(1, Math.min(MAX_WORKERS, cores - 1));
}

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

  /**
   * Run a named task on the pool.
   *
   * @param {string} task - Task name registered in `../tasks/index.js`
   * @param {unknown} payload - Structured-cloneable input
   * @param {{ transfer?: Transferable[], signal?: AbortSignal }} [options]
   * @returns {Promise<unknown>}
   */
  run(task, payload, options = {}) {
    if (this._isDisposed) {
      return Promise.reject(new Error("WorkerPool has been disposed"));
    }

    const { transfer = [], signal } = options;

    if (signal?.aborted) {
      return Promise.reject(signal.reason ?? new Error("Aborted"));
    }

    return new Promise((resolve, reject) => {
      const job = { id: this._nextId++, task, payload, transfer, signal, resolve, reject };

      if (signal) {
        signal.addEventListener(
          "abort",
          () => {
            this._abort(job);
          },
          { once: true },
        );
      }

      this._queue.push(job);
      this._drain();
    });
  }

  /** Terminate every worker and reject everything still outstanding. */
  dispose() {
    const abandoned = [...this._queue, ...this._inFlight.values()];

    this._isDisposed = true;
    this._queue = [];
    this._inFlight.clear();
    this._idle = [];

    for (const worker of this._workers) {
      worker.terminate();
    }

    this._workers = [];

    for (const job of abandoned) {
      job.reject(new Error("WorkerPool has been disposed"));
    }
  }

  /** @returns {{ size: number, spawned: number, idle: number, queued: number }} */
  stats() {
    return {
      size: this._size,
      spawned: this._workers.length,
      idle: this._idle.length,
      queued: this._queue.length,
    };
  }

  /** Hand queued jobs to idle workers, spawning up to `_size` on demand. */
  _drain() {
    while (this._queue.length > 0) {
      const worker = this._idle.pop() ?? this._spawn();

      if (!worker) {
        return;
      }

      const job = this._queue.shift();

      this._inFlight.set(worker, job);
      worker.postMessage({ id: job.id, task: job.task, payload: job.payload }, job.transfer);
    }
  }

  /**
   * Create a worker, or return undefined when the pool is already at capacity.
   *
   * @returns {Worker|undefined}
   */
  _spawn() {
    if (this._workers.length >= this._size) {
      return undefined;
    }

    const worker = this._createWorker();

    worker.addEventListener("message", ({ data }) => {
      this._settle(worker, data);
    });

    // Uncaught throw inside the worker: no id, so the in-flight job is the only
    // thing that can have caused it. Replace the worker - its state is unknown.
    worker.addEventListener("error", (event) => {
      this._fail(worker, new Error(event.message || "Worker crashed"));
    });

    // Payload could not be cloned on arrival.
    worker.addEventListener("messageerror", () => {
      this._fail(worker, new Error("Worker received an uncloneable message"));
    });

    this._workers.push(worker);

    return worker;
  }

  /**
   * Resolve or reject the job a worker just answered, then reuse the worker.
   *
   * @param {Worker} worker
   * @param {{ id: number, ok: boolean, result?: unknown, error?: object }} data
   */
  _settle(worker, data) {
    const job = this._inFlight.get(worker);

    this._inFlight.delete(worker);
    this._idle.push(worker);

    if (job && job.id === data.id) {
      if (data.ok) {
        job.resolve(data.result);
      } else {
        job.reject(deserializeError(data.error));
      }
    }

    this._drain();
  }

  /**
   * Discard a broken worker, fail its job, and refill the pool.
   *
   * @param {Worker} worker
   * @param {Error} error
   */
  _fail(worker, error) {
    const job = this._inFlight.get(worker);

    this._inFlight.delete(worker);
    this._retire(worker);

    if (job) {
      job.reject(error);
    }

    this._drain();
  }

  /**
   * Abort a job. Queued jobs are dropped; a running job cannot be interrupted
   * mid-computation, so its worker is terminated and replaced - that is the
   * only way to actually give the CPU back.
   *
   * @param {object} job
   */
  _abort(job) {
    const reason = job.signal?.reason ?? new Error("Aborted");
    const queuedAt = this._queue.indexOf(job);

    if (queuedAt >= 0) {
      this._queue.splice(queuedAt, 1);
      job.reject(reason);

      return;
    }

    for (const [worker, running] of this._inFlight) {
      if (running === job) {
        this._inFlight.delete(worker);
        this._retire(worker);
        job.reject(reason);
        break;
      }
    }

    this._drain();
  }

  /**
   * Terminate a worker and remove it from the pool bookkeeping.
   *
   * @param {Worker} worker
   */
  _retire(worker) {
    const index = this._workers.indexOf(worker);
    const idleAt = this._idle.indexOf(worker);

    if (index >= 0) {
      this._workers.splice(index, 1);
    }

    if (idleAt >= 0) {
      this._idle.splice(idleAt, 1);
    }

    worker.terminate();
  }
}
