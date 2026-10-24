/**
 * @module workers/pool-worker
 *
 * Worker entry point. Owns no logic of its own: it resolves a task name to a
 * pure function from `../tasks/`, runs it, and posts the result back on the
 * request envelope.
 *
 * Keeping the logic in `../tasks/` means every task is unit-testable on the
 * main thread, with no worker and no jsdom shim.
 */

import { TASKS } from "../tasks/index.js";
import { serializeError } from "./_task-envelope.js";

self.addEventListener("message", async ({ data }) => {
  const { id, task, payload } = data;
  const run = TASKS[task];

  if (!run) {
    self.postMessage({ id, ok: false, error: serializeError(new Error(`Unknown task "${task}"`)) });

    return;
  }

  try {
    const { result, transfer = [] } = normalize(await run(payload));

    self.postMessage({ id, ok: true, result }, transfer);
  } catch (thrown) {
    self.postMessage({ id, ok: false, error: serializeError(thrown) });
  }
});

/**
 * Accept either a bare result or `{ result, transfer }` from a task.
 *
 * @param {unknown} returned - Task return value
 * @returns {{ result: unknown, transfer?: Transferable[] }}
 */
function normalize(returned) {
  const isEnvelope = returned !== null && typeof returned === "object" && Array.isArray(returned.transfer);

  if (isEnvelope) {
    return returned;
  }

  return { result: returned };
}
