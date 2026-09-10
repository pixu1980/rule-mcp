

/** @module core/telemetry/flight/export */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getProjectPaths } from "../../../cli/paths/index.js";
import { drain, readEvents } from "../store/index.js";
import { resetProjectId } from "../recorder/_identity.js";
import { toFlight } from "./_envelope.js";
import { redactFlight } from "./_redact.js";

/**
 * Write the recording out as one file, then empty the log.
 *
 * @param {{
 *   projectDir?: string,
 *   home?: string,
 *   exportedAt?: number,
 *   label?: string,
 *   keep?: boolean,
 * }} [options]
 * @returns {{ file: string, flight: object, calls: number, drained: number }}
 */
export function exportFlight(options = {}) {
  const events = readEvents();

  if (events.length === 0) {
    throw new Error("Nothing recorded yet.");
  }

  const exportedAt = options.exportedAt ?? Date.now();
  const full = toFlight(events, { ...options, exportedAt });
  // Redaction is a share-time transform, not a record-time one: the local
  // recording stays complete, and only the copy meant to leave the machine
  // loses prompt text and absolute paths (hardening 2.1).
  const flight = options.redact ? redactFlight(full) : full;

  const { exportsDir } = getProjectPaths(options.projectDir ?? process.cwd());
  mkdirSync(exportsDir, { recursive: true });
  // Named by the moment it was taken, so exports sort chronologically in a
  // directory listing and two of them never collide.
  const stamp = new Date(exportedAt).toISOString().replaceAll(/[.:]/g, "-");
  const file = join(exportsDir, `${stamp}${options.redact ? ".redacted" : ""}.flight`);
  writeFileSync(file, JSON.stringify(flight, undefined, 2));

  // Only now, with the file on disk. Draining first would trade a recording for
  // a failed write.
  let drained = 0;

  if (!options.keep) {
    drained = drain().removed;
    // The id named the window that just closed, so the next call opens a new one.
    resetProjectId();
  }

  return { file, flight, calls: events.length, drained };
}
