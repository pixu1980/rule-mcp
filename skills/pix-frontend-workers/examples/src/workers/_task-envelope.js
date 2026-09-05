/**
 * @module workers/task-envelope
 *
 * Wire format shared by the main thread and the pool worker.
 *
 * Request:  { id, task, payload }
 * Success:  { id, ok: true,  result }
 * Failure:  { id, ok: false, error: { name, message, stack } }
 *
 * Errors survive structured clone as `Error` instances, but only when they are
 * thrown across a boundary that clones them. An uncaught throw inside a worker
 * fires `onerror` with no correlation id, so failures are serialized by hand
 * and posted back on the same envelope as the request.
 */

/**
 * Convert a thrown value into a cloneable plain object.
 *
 * @param {unknown} thrown - Whatever `catch` received
 * @returns {{ name: string, message: string, stack: string }}
 */
export function serializeError(thrown) {
  if (thrown instanceof Error) {
    return { name: thrown.name, message: thrown.message, stack: thrown.stack ?? "" };
  }

  return { name: "Error", message: String(thrown), stack: "" };
}

/**
 * Rebuild an Error on the main thread, keeping the worker-side stack.
 *
 * @param {{ name?: string, message?: string, stack?: string }} serialized
 * @returns {Error}
 */
export function deserializeError(serialized) {
  const error = new Error(serialized?.message ?? "Worker task failed");

  error.name = serialized?.name ?? "Error";
  if (serialized?.stack) {
    error.stack = serialized.stack;
  }

  return error;
}
