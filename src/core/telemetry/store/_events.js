/** @module core/telemetry/store/events */

import { appendFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { ensureDirectory, eventsFile } from "./_paths.js";

/**
 * Append events as JSONL. Never throws.
 *
 * @param {object[]} events
 * @returns {boolean} whether they were written
 */
export function appendEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return false;
  }

  if (!ensureDirectory()) {
    return false;
  }

  try {
    appendFileSync(eventsFile(), events.map((event) => JSON.stringify(event)).join("\n") + "\n");

    return true;
  } catch {
    return false;
  }
}

/**
 * Read the raw log. A malformed line is skipped rather than fatal: a truncated
 * write from a killed process must not make the whole history unreadable.
 *
 * @returns {object[]}
 */
export function readEvents() {
  try {
    if (!existsSync(eventsFile())) {
      return [];
    }

    return readFileSync(eventsFile(), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** @returns {number} bytes currently used by the raw log */
export function stateSize() {
  try {
    return existsSync(eventsFile()) ? statSync(eventsFile()).size : 0;
  } catch {
    return 0;
  }
}

/** Write events back, replacing the log. Never throws. */
export function writeEvents(events) {
  if (!ensureDirectory()) {
    return false;
  }

  try {
    writeFileSync(eventsFile(), events.map((event) => JSON.stringify(event)).join("\n") + (events.length > 0 ? "\n" : ""));

    return true;
  } catch {
    return false;
  }
}
