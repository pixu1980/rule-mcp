/**
 * @module workers/pool-internal
 *
 * Internal WorkerPool bookkeeping: drain, spawn, settle, fail, abort, retire.
 */

import { deserializeError } from "./_task-envelope.js";

export const poolInternalMethods = {
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
  },

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
  },

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
  },

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
  },

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
  },

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
  },
};
