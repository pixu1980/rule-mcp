/** @module core/telemetry/store/retention */

import { rmSync } from "node:fs";
import { DAY_MS, MAX_EVENTS_BYTES, RAW_RETENTION_DAYS } from "./_constants.js";
import { readEvents, stateSize, writeEvents } from "./_events.js";
import { eventsFile, projectIdFile, rollupFile, usageFile } from "./_paths.js";
import { rollup } from "./_rollup.js";

/**
 * Drop raw events past retention, and enforce the size cap regardless.
 *
 * Rollup runs first so nothing is dropped before it has been counted.
 *
 * @param {{ now?: number }} [options]
 * @returns {{ removed: number, kept: number }}
 */
export function purge(options = {}) {
  const now = options.now ?? Date.now();
  const cutoff = now - RAW_RETENTION_DAYS * DAY_MS;
  const events = readEvents();
  let kept = events.filter((event) => (event.ts ?? 0) > cutoff);

  // The cap is the backstop for a machine that never rolls up: halve the log
  // rather than refuse to write, so recording keeps working either way.
  if (stateSize() > MAX_EVENTS_BYTES) {
    kept = kept.slice(Math.floor(kept.length / 2));
  }

  if (kept.length !== events.length) {
    writeEvents(kept);
  }

  return { removed: events.length - kept.length, kept: kept.length };
}

/**
 * Roll up, then purge. The order is the invariant: purging first would discard
 * events that had never been counted.
 *
 * @param {{ now?: number }} [options]
 */
export function maintain(options = {}) {
  rollup(options);

  return purge(options);
}

/**
 * Empty the log.
 *
 * An export is the archive, so what it has written out must not also stay
 * behind: the next export would count the same calls twice and every benchmark
 * would drift upward on its own. The project id goes with them, because the id
 * exists to group one recording window and the window has just closed.
 *
 * @returns {{ removed: number }}
 */
export function drain() {
  const removed = readEvents().length;

  for (const file of [eventsFile(), rollupFile(), projectIdFile(), usageFile()]) {
    try {
      rmSync(file, { force: true });
    } catch {
      /* a file that cannot be removed is reported as still there by the next read */
    }
  }

  return { removed };
}
