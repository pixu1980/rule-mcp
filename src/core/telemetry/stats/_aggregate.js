/** @module core/telemetry/stats/aggregate */

import { percentile } from "./_percentile.js";

/**
 * Fold events into the numbers the read surfaces show.
 *
 * @param {object[]} events
 * @returns {object}
 */
export function aggregate(events = []) {
  const calls = events.length;
  const durations = events.map((event) => Number(event.durationMs) || 0);
  const byTool = {};
  const bySkill = {};
  const byTier = {};
  const byEntry = {};
  let errors = 0;
  let cacheHits = 0;
  let savedTokens = 0;
  let estimatedTokens = 0;
  let guardrailFailures = 0;
  const savedBySource = {};

  for (const event of events) {
    byTool[event.tool] = (byTool[event.tool] ?? 0) + 1;

    if (event.routedSkill) {
      bySkill[event.routedSkill] = (bySkill[event.routedSkill] ?? 0) + 1;
    }

    if (event.ok === false) {
      errors += 1;
    }

    if (event.cacheHit) {
      cacheHits += 1;
    }

    if (event.cacheTier) {
      byTier[event.cacheTier] = (byTier[event.cacheTier] ?? 0) + 1;
    }

    if (event.entry) {
      byEntry[event.entry] = (byEntry[event.entry] ?? 0) + 1;
    }

    if (typeof event.guardrailFailures === "number") {
      guardrailFailures += event.guardrailFailures;
    }

    for (const [source, value] of Object.entries(event.saved ?? {})) {
      const amount = Number(value) || 0;
      savedTokens += amount;
      savedBySource[source] = (savedBySource[source] ?? 0) + amount;
    }

    estimatedTokens += Number(event.estimatedRouting) || 0;
  }

  return {
    calls,
    errors,
    errorRate: calls > 0 ? errors / calls : 0,
    cacheHits,
    cacheHitRate: calls > 0 ? cacheHits / calls : 0,
    latencyP50: percentile(durations, 0.5),
    latencyP95: percentile(durations, 0.95),
    savedTokens,
    savedBySource,
    estimatedTokens,
    guardrailFailures,
    byTool,
    bySkill,
    byTier,
    byEntry,
    sessions: new Set(events.map((event) => event.session)).size,
  };
}
