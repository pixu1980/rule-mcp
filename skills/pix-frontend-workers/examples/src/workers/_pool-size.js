/**
 * @module workers/pool-size
 *
 * Pool size hint: one worker per logical core, minus the core the UI runs on.
 */

/** Hard ceiling on pool size. More workers than this stops paying for itself. */
export const MAX_WORKERS = 4;

/**
 * `navigator.hardwareConcurrency` is a hint, not a promise. Browsers clamp it
 * to resist fingerprinting and it says nothing about current load.
 *
 * @returns {number}
 */
export function defaultSize() {
  const cores = globalThis.navigator?.hardwareConcurrency ?? 4;

  return Math.max(1, Math.min(MAX_WORKERS, cores - 1));
}
