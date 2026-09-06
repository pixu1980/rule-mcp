/** @module core/telemetry/store/rollup */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { readEvents } from "./_events.js";
import { ensureDirectory, rollupFile } from "./_paths.js";

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
