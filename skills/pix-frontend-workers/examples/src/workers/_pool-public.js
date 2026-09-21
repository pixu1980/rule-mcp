/**
 * @module workers/pool-public
 *
 * Public WorkerPool operations: enqueue work, dispose, and report stats.
 */

export const poolPublicMethods = {
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
  },

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
  },

  /** @returns {{ size: number, spawned: number, idle: number, queued: number }} */
  stats() {
    return {
      size: this._size,
      spawned: this._workers.length,
      idle: this._idle.length,
      queued: this._queue.length,
    };
  },
};
