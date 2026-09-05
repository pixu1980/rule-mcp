/**
 * @module index
 *
 * Usage of the worker layer from application code, framework-neutral.
 *
 * The three things a call site is responsible for:
 *   1. passing an `AbortSignal` so a superseded request cannot land late,
 *   2. transferring binary payloads instead of cloning them,
 *   3. leaving pool lifetime to the module singleton.
 */

import { runTask, disposePool } from "./workers/index.js";

/**
 * Parse an uploaded CSV without blocking input.
 *
 * @param {File} file
 * @param {AbortSignal} signal
 * @returns {Promise<Array<Record<string, string>>>}
 */
export async function importSpreadsheet(file, signal) {
  const text = await file.text();

  return runTask("parseCsv", { text }, { signal });
}

/**
 * Desaturate image data off the main thread. The buffer is transferred both
 * ways, so `imageData.data` is detached once this call starts.
 *
 * @param {ImageData} imageData
 * @param {AbortSignal} signal
 * @returns {Promise<ImageData>}
 */
export async function desaturate(imageData, signal) {
  const buffer = imageData.data.buffer;
  const processed = await runTask("grayscale", buffer, { transfer: [buffer], signal });

  return new ImageData(new Uint8ClampedArray(processed), imageData.width, imageData.height);
}

/**
 * Latest-wins wrapper: each call aborts the previous one, so a fast typist
 * never waits behind stale work.
 *
 * @param {string} task
 * @returns {(payload: unknown) => Promise<unknown>}
 */
export function latestOnly(task) {
  /** @type {AbortController|undefined} */
  let inFlight;

  return (payload) => {
    inFlight?.abort(new DOMException("Superseded", "AbortError"));
    inFlight = new AbortController();

    return runTask(task, payload, { signal: inFlight.signal });
  };
}

globalThis.addEventListener?.(
  "pagehide",
  () => {
    disposePool();
  },
  { once: true },
);
