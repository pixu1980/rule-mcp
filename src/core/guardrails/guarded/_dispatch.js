

/** checkCodeGuarded: the race between the worker's answer and the budget. */
import { checkCode } from "../engine/index.js";
import { defaultTimeoutMs, guardedEnabled } from "./_policy.js";
import { abortedResult, clearWorker, currentWorker, nextId, pending, setWorker, spawn } from "./_messaging.js";

/**
 * Run checkCode in the guarded worker.
 *
 * @param {string} skillName
 * @param {string} code
 * @param {object} [context]
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<object>} the checkCode result, or an aborted-shaped result
 */
export async function checkCodeGuarded(skillName, code, context = {}, options = {}) {
  if (!guardedEnabled()) {
    return checkCode(skillName, code, context);
  }

  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs();

  if (!currentWorker()) {
    setWorker(spawn());
  }

  const worker = currentWorker();
  const id = nextId();

  const answer = new Promise((resolve) => {
    pending.set(id, { resolve });
  });
  worker.postMessage({ id, skillName, code, context });

  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      pending.delete(id);

      if (currentWorker() === worker) {
        clearWorker();
      }
      // Terminate, don't wait: the worker is busy-looping in a regex and will
      // never see a polite message.
      worker.terminate().catch(() => {});
      resolve(abortedResult(skillName, `Check exceeded ${timeoutMs}ms and was terminated.`));
    }, timeoutMs);
    timer.unref?.();
  });

  const result = await Promise.race([answer.then((r) => (clearTimeout(timer), r)), timeout]);

  if (result?.workerError) {
    return abortedResult(skillName, `Worker error: ${result.workerError}`);
  }

  return result;
}

/** Stop the worker (tests and clean shutdown). */
export async function shutdownGuardrailWorker() {
  const worker = currentWorker();

  clearWorker();
  pending.clear();

  if (worker) {
    await worker.terminate().catch(() => {});
  }

  return null;
}
