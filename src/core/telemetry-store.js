/**
 * @module core/telemetry-store
 *
 * Where telemetry lives on disk, and how it stops growing.
 *
 * Append-only JSONL for raw events plus a rollup file of daily aggregates. Two
 * files and no database on purpose: SQLite would mean either a native
 * dependency, which this project does not take, or `node:sqlite`, which needs
 * Node 22 while `engines` still says 20.
 *
 * Both live in this project's own directory under the install,
 * `the projects root under the state dir` (ADR 082). Filed per project, because a
 * hit rate or a token saving averaged over every repository on a disk is a
 * number about the machine; the question anyone actually asks is what this
 * server did on THIS codebase. Kept out of the project, because nothing this
 * server records is something a repository should carry.
 *
 * Retention is the part that matters. Raw events carry per-call detail and are
 * purged after seven days; the daily aggregates they roll into are small enough
 * to keep forever. A size cap sits underneath both, because a machine that
 * never runs the rollup should still not fill up.
 *
 * Every function here is defensive to the point of silence: a telemetry writer
 * that throws would break the tool call it was only supposed to watch.
 *
 * @see module:core/telemetry - what gets recorded
 * @see module:cli/paths - where the project directory is
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getProjectPaths } from "../cli/paths.js";

/** Raw events are kept this long, then dropped. Aggregates outlive them. */
export const RAW_RETENTION_DAYS = 7;

/** Hard ceiling on the raw log. Past this the oldest half goes, rollup or not. */
export const MAX_EVENTS_BYTES = 8 * 1024 * 1024;

const DAY_MS = 86_400_000;

/** @returns {string} path of the raw event log */
export function eventsFile() {
  return join(getProjectPaths().dir, "telemetry.jsonl");
}

/** @returns {string} path of the daily aggregate file */
export function rollupFile() {
  return join(getProjectPaths().dir, "telemetry-rollup.json");
}

/** @returns {string} path of the per-project id */
export function projectIdFile() {
  return join(getProjectPaths().dir, "project-id");
}

/** @returns {string} path of the usage an agent declared for itself */
export function usageFile() {
  return join(getProjectPaths().dir, "usage.json");
}

/**
 * Store the usage an agent reported about itself.
 *
 * The escape hatch for agents whose transcripts this server cannot read. It is
 * stamped `sidecar` so it can never be mistaken for a figure read off disk:
 * a declaration is as trustworthy as whoever made it, and a benchmark has to
 * say which of its numbers were measured.
 *
 * @param {object} usage
 * @returns {boolean} whether it was stored
 */
export function writeSidecarUsage(usage) {
  if (!usage || typeof usage !== "object" || !ensureDirectory()) {
    return false;
  }

  try {
    writeFileSync(usageFile(), JSON.stringify({ ...usage, source: "sidecar" }, undefined, 2));

    return true;
  } catch {
    return false;
  }
}

/** @returns {object|undefined} the declared usage, if there is one */
export function readSidecarUsage() {
  try {
    if (!existsSync(usageFile())) {
      return;
    }

    const parsed = JSON.parse(readFileSync(usageFile(), "utf8"));

    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return;
  }
}

/** Ensure the project directory exists. Returns false when it cannot be created. */
function ensureDirectory() {
  try {
    const { dir } = getProjectPaths();
    mkdirSync(dir, { recursive: true });

    return true;
  } catch {
    return false;
  }
}

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

/** @returns {object[]} the daily aggregates */
export function readRollups() {
  try {
    if (!existsSync(rollupFile())) {
      return [];
    }

    const parsed = JSON.parse(readFileSync(rollupFile(), "utf8"));

    return Array.isArray(parsed) ? parsed : [];
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
function writeEvents(events) {
  if (!ensureDirectory()) {
    return false;
  }

  try {
    writeFileSync(
      eventsFile(),
      events.map((event) => JSON.stringify(event)).join("\n") + (events.length > 0 ? "\n" : ""),
    );

    return true;
  } catch {
    return false;
  }
}

/** @param {number} ts @returns {string} the UTC date, ISO form */
const dayOf = (ts) => new Date(ts).toISOString().slice(0, 10);

/**
 * Fold raw events into per-day aggregates and merge them into the rollup file.
 *
 * Counts only. A daily aggregate that kept its events would be the raw log with
 * extra steps, and the point of the rollup is that it is small enough to keep.
 *
 * @param {{ now?: number }} [options]
 * @returns {{ days: number }}
 */
export function rollup(options = {}) {
  const now = options.now ?? Date.now();
  const events = readEvents();

  if (events.length === 0) {
    return { days: 0 };
  }

  const existing = new Map(readRollups().map((day) => [day.date, day]));
  const today = dayOf(now);

  const byDay = new Map();

  for (const event of events) {
    const date = dayOf(event.ts ?? now);
    // Today is still accumulating; folding it now would double count on the
    // next run, when the same events are still in the raw log.
    if (date === today) {
      continue;
    }

    if (!byDay.has(date)) {
      byDay.set(date, { date, calls: 0, errors: 0, cacheHits: 0, savedTokens: 0, estimatedTokens: 0, byTool: {} });
    }

    const day = byDay.get(date);
    day.calls += 1;

    if (event.ok === false) {
      day.errors += 1;
    }

    if (event.cacheHit) {
      day.cacheHits += 1;
    }

    day.savedTokens += Object.values(event.saved ?? {}).reduce((a, b) => a + (Number(b) || 0), 0);
    day.estimatedTokens += Number(event.estimatedRouting) || 0;
    day.byTool[event.tool] = (day.byTool[event.tool] ?? 0) + 1;
  }

  for (const [date, day] of byDay) {
    const previous = existing.get(date);
    existing.set(
      date,
      previous
        ? {
            ...previous,
            calls: previous.calls + day.calls,
            errors: previous.errors + day.errors,
            cacheHits: previous.cacheHits + day.cacheHits,
            savedTokens: previous.savedTokens + day.savedTokens,
            estimatedTokens: previous.estimatedTokens + day.estimatedTokens,
            byTool: Object.fromEntries(
              [...new Set([...Object.keys(previous.byTool ?? {}), ...Object.keys(day.byTool)])].map((tool) => [
                tool,
                (previous.byTool?.[tool] ?? 0) + (day.byTool[tool] ?? 0),
              ]),
            ),
          }
        : day,
    );
  }

  if (ensureDirectory()) {
    try {
      writeFileSync(
        rollupFile(),
        JSON.stringify(
          [...existing.values()].sort((a, b) => a.date.localeCompare(b.date)),
          undefined,
          2,
        ),
      );
    } catch {
      /* a rollup that cannot be written is not worth failing a session over */
    }
  }

  return { days: byDay.size };
}

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
