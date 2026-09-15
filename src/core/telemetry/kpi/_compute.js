

/** @module core/telemetry/kpi/compute */

import { percentile } from "../stats/_percentile.js";
import { foldEvents } from "./_fold.js";
import { IDLE_GAP_MS, inferIterations } from "./_iterations.js";

/** @param {object} counts @returns {number} the sum of a counter map */
const sum = (counts) => Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0);

/** @param {number} n @param {number} d @returns {number|undefined} a ratio, or nothing when undefined */
const ratio = (n, d) => (d > 0 ? n / d : undefined);

/**
 * Fold events, the agent's usage and the project snapshot into one KPI block.
 *
 * @param {{ events?: object[], usage?: object, project?: object, now?: number, idleGapMs?: number }} [options]
 * @returns {object}
 */
export function computeKpi(options = {}) {
  const events = options.events ?? [];
  const usage = options.usage;
  const project = options.project;
  const idleGapMs = options.idleGapMs ?? IDLE_GAP_MS;
  const fold = foldEvents(events);

  const total = events.length;
  const timestamps = events.map((event) => Number(event.ts) || 0).filter(Boolean);
  const activeMs = timestamps.length > 1 ? Math.max(...timestamps) - Math.min(...timestamps) : 0;

  // The model's whole context traffic, which is what our own output is a share
  // of. Cache reads are included because a cached token still occupies the
  // window it was read into.
  const llmTokens = usage ? (Number(usage.input) || 0) + (Number(usage.output) || 0) + (Number(usage.cacheRead) || 0) + (Number(usage.cacheWrite) || 0) : 0;
  const costPerToken = usage?.costUsd === undefined ? undefined : ratio(usage.costUsd, llmTokens);

  // The transcript counted the user's turns directly. An inference over the
  // prompts we happened to see is the fallback, never the preference.
  const inferred = inferIterations(events, idleGapMs);
  const iterations = Number(usage?.userTurns) > 0 ? { ...inferred, count: Number(usage.userTurns), estimated: false } : inferred;

  const outputTokens = Number(usage?.output) || 0;
  const lines = Number(project?.lines?.total) || 0;

  return {
    calls: {
      total,
      tools: total - fold.resources,
      resources: fold.resources,
      distinctTools: Object.keys(fold.byTool).length,
      errors: fold.errors,
      errorRate: ratio(fold.errors, total) ?? 0,
      sessions: new Set(events.map((event) => event.session)).size,
    },
    latency: { p50: percentile(fold.durations, 0.5), p95: percentile(fold.durations, 0.95) },
    mcp: {
      resultBytes: fold.resultBytes,
      resultTokens: fold.resultTokens,
      argsBytes: fold.argsBytes,
      argsTokens: fold.argsTokens,
      avgResultTokens: total > 0 ? Math.round(fold.resultTokens / total) : 0,
      // What share of everything the model read came from this server. The
      // question "is the MCP server expensive" has no other honest answer.
      ...(llmTokens > 0 && { shareOfLlmTokens: fold.resultTokens / llmTokens }),
      ...(costPerToken !== undefined && {
        costUsd: fold.resultTokens * costPerToken,
        shareOfSessionCost: ratio(fold.resultTokens, llmTokens),
      }),
    },
    tokens: {
      measuredSaved: sum(fold.savedBySource),
      savedBySource: fold.savedBySource,
      // Kept apart, always. See the module note.
      estimatedRouting: fold.estimatedRouting,
      coreTokens: fold.coreTokens,
      finalTokens: fold.finalTokens,
      // What compression removed, over what it was given. Derived from the
      // measured saving rather than from core-minus-final: the difference
      // between the two ends of post-processing nets compression against the
      // reminder added in the same step, which is why every export reported a
      // compression of zero on results that demonstrably compressed (ADR 071).
      // The reminder's own cost stays in reminderOverhead, below.
      ...(fold.coreTokens > 0 && {
        compressionRatio: Math.min(1, (fold.savedBySource.compression ?? 0) / fold.coreTokens),
      }),
      // What the reminder cost, from the recorder rather than from the gap
      // between the two ends of post-processing: compression runs in the same
      // step, so the gap is the two netted against each other and reads zero
      // whenever compression removed more than the reminder added. A log
      // written before the field existed has only the gap to offer.
      reminderOverhead: fold.hasReminderTokens ? fold.reminderTokens : Math.max(0, fold.finalTokens - fold.coreTokens),
    },
    guardrails: { failures: fold.guardrailFailures, byRule: fold.guardrailByRule },
    cache: {
      hits: fold.cacheHits,
      hitRate: ratio(fold.cacheHits, total) ?? 0,
      byTier: fold.byTier,
      // The two honest facts about a hit: how much output it served, and the
      // recomputation it skipped. The second is small on purpose - this server
      // does no inference, so a miss costs milliseconds, not seconds.
      replayedTokens: fold.replayedTokens,
      recomputeSavedMsPerHit: Math.max(0, (percentile(fold.missDurations, 0.5) ?? 0) - (percentile(fold.hitDurations, 0.5) ?? 0)),
    },
    routing: { byTool: fold.byTool, bySkill: fold.bySkill, byEntry: fold.byEntry, byMode: fold.byMode },
    iterations,
    productivity: {
      activeMs,
      avgPerCallMs: total > 0 ? Math.round(activeMs / total) : 0,
      ...(lines > 0 && activeMs > 0 && { linesPerMinute: lines / (activeMs / 60_000) }),
      ...(lines > 0 && iterations.count > 0 && { linesPerPrompt: lines / iterations.count }),
      ...(usage?.costUsd !== undefined && outputTokens > 0 && { costPer1kOutput: (usage.costUsd / outputTokens) * 1000 }),
      ...(usage?.costUsd !== undefined && iterations.count > 0 && { costPerPrompt: usage.costUsd / iterations.count }),
    },
  };
}
