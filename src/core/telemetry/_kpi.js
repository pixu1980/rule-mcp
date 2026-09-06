/**
 * @module core/kpi
 *
 * The numbers a benchmark of this server is actually made of.
 *
 * Three sources meet here and are kept apart on purpose:
 *
 *   - **Measured by us**: how many bytes our own results took, what the cache
 *     replayed, what caveman compressed, which guardrails failed.
 *   - **Measured by the agent**: the model's tokens and money, read from its
 *     transcript. Real figures, but not ours.
 *   - **Modeled**: what reading the whole skill file would have cost, and how
 *     many times a person had to ask again. Both are guesses, both are labeled.
 *
 * The one rule inherited from the telemetry design still holds and matters most
 * here, because this is where the headline numbers are made: the routing
 * estimate never merges into a measured total. It is the largest of the three
 * numbers, so merging it would be the most flattering and least defensible
 * thing this server could report.
 *
 * @see module:core/telemetry/stats - percentiles and rendering
 * @see module:core/agents/transcripts - where the model's usage comes from
 */

import { percentile } from "./_stats.js";

/**
 * A pause longer than this between two prompts is read as the user coming back
 * with something new, rather than the same request still being worked on.
 *
 * Ninety seconds separates the two shapes it has to tell apart: a retry lands
 * seconds after the prompt it repeats, a follow-up minutes after. It is a
 * heuristic, and every count derived from it is flagged `estimated`.
 */
export const IDLE_GAP_MS = 90_000;

/** @param {object} counts @returns {number} the sum of a counter map */
const sum = (counts) => Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0);

/** @param {number} n @param {number} d @returns {number|undefined} a ratio, or nothing when undefined */
const ratio = (n, d) => (d > 0 ? n / d : undefined);

/**
 * How many separate times someone asked for something.
 *
 * Only the prompts this server saw are visible, so a follow-up typed at an
 * agent that never called a rule tool is invisible to the inference. That is
 * why the transcript's own user-turn count wins whenever it exists.
 *
 * @param {object[]} events
 * @param {number} idleGapMs
 * @returns {{ count: number, distinctPrompts: number, retries: number, estimated: boolean }}
 */
function inferIterations(events, idleGapMs) {
  const prompted = events.filter((event) => event.promptLength !== undefined).sort((a, b) => a.ts - b.ts);
  const texts = new Set();
  let count = 0;
  let retries = 0;
  let previous;

  for (const event of prompted) {
    if (previous === undefined || event.ts - previous > idleGapMs) {
      count += 1;
    }
    // The same text asked twice is the signal the reports found most telling:
    // it means the first attempt produced nothing usable.
    if (event.prompt !== undefined) {
      if (texts.has(event.prompt)) {
        retries += 1;
      }

      texts.add(event.prompt);
    }

    previous = event.ts;
  }

  return { count, distinctPrompts: texts.size, retries, estimated: true };
}

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

  const byTool = {};
  const bySkill = {};
  const byTier = {};
  const byEntry = {};
  const byMode = {};
  const guardrailByRule = {};
  const savedBySource = {};
  let errors = 0;
  let cacheHits = 0;
  let resources = 0;
  let guardrailFailures = 0;
  let resultBytes = 0;
  let resultTokens = 0;
  let argsBytes = 0;
  let argsTokens = 0;
  let coreTokens = 0;
  let finalTokens = 0;
  let reminderTokens = 0;
  let hasReminderTokens = false;
  let estimatedRouting = 0;
  let replayedTokens = 0;
  const durations = [];
  const hitDurations = [];
  const missDurations = [];

  for (const event of events) {
    byTool[event.tool] = (byTool[event.tool] ?? 0) + 1;
    durations.push(Number(event.durationMs) || 0);

    if (event.resource) {
      resources += 1;
    }

    if (event.ok === false) {
      errors += 1;
    }

    if (event.cacheHit) {
      cacheHits += 1;
      hitDurations.push(Number(event.durationMs) || 0);
    } else if (event.tool) {
      missDurations.push(Number(event.durationMs) || 0);
    }

    // What the cache handed back without recomputing it. Not a token saving:
    // the model reads every one of those tokens. `saved.cache` is how a log
    // written before this distinction recorded the same quantity, and counting
    // it as a saving is what made the measured total ~27x the real one.
    replayedTokens += (Number(event.replayedTokens) || 0) + (Number(event.saved?.cache) || 0);

    if (event.cacheTier) {
      byTier[event.cacheTier] = (byTier[event.cacheTier] ?? 0) + 1;
    }

    if (event.entry) {
      byEntry[event.entry] = (byEntry[event.entry] ?? 0) + 1;
    }

    if (event.mode) {
      byMode[event.mode] = (byMode[event.mode] ?? 0) + 1;
    }

    if (event.routedSkill) {
      bySkill[event.routedSkill] = (bySkill[event.routedSkill] ?? 0) + 1;
    }

    if (typeof event.guardrailFailures === "number") {
      guardrailFailures += event.guardrailFailures;
    }

    for (const [rule, count] of Object.entries(event.guardrailRules ?? {})) {
      guardrailByRule[rule] = (guardrailByRule[rule] ?? 0) + (Number(count) || 0);
    }

    for (const [source, value] of Object.entries(event.saved ?? {})) {
      if (source === "cache") {
        continue; // counted as replayed output above, which is what it is
      }

      savedBySource[source] = (savedBySource[source] ?? 0) + (Number(value) || 0);
    }

    resultBytes += Number(event.resultBytes) || 0;
    resultTokens += Number(event.resultTokensEst) || 0;
    argsBytes += Number(event.argsBytes) || 0;
    argsTokens += Number(event.argsTokensEst) || 0;
    coreTokens += Number(event.coreTokens) || 0;
    finalTokens += Number(event.finalTokens) || 0;

    if (typeof event.reminderTokens === "number") {
      reminderTokens += event.reminderTokens;
      hasReminderTokens = true;
    }

    estimatedRouting += Number(event.estimatedRouting) || 0;
  }

  const total = events.length;
  const timestamps = events.map((event) => Number(event.ts) || 0).filter(Boolean);
  const activeMs = timestamps.length > 1 ? Math.max(...timestamps) - Math.min(...timestamps) : 0;

  // The model's whole context traffic, which is what our own output is a share
  // of. Cache reads are included because a cached token still occupies the
  // window it was read into.
  const llmTokens = usage
    ? (Number(usage.input) || 0) +
      (Number(usage.output) || 0) +
      (Number(usage.cacheRead) || 0) +
      (Number(usage.cacheWrite) || 0)
    : 0;
  const costPerToken = usage?.costUsd === undefined ? undefined : ratio(usage.costUsd, llmTokens);

  // The transcript counted the user's turns directly. An inference over the
  // prompts we happened to see is the fallback, never the preference.
  const inferred = inferIterations(events, idleGapMs);
  const iterations =
    Number(usage?.userTurns) > 0 ? { ...inferred, count: Number(usage.userTurns), estimated: false } : inferred;

  const outputTokens = Number(usage?.output) || 0;
  const lines = Number(project?.lines?.total) || 0;

  return {
    calls: {
      total,
      tools: total - resources,
      resources,
      distinctTools: Object.keys(byTool).length,
      errors,
      errorRate: ratio(errors, total) ?? 0,
      sessions: new Set(events.map((event) => event.session)).size,
    },
    latency: { p50: percentile(durations, 0.5), p95: percentile(durations, 0.95) },
    mcp: {
      resultBytes,
      resultTokens,
      argsBytes,
      argsTokens,
      avgResultTokens: total > 0 ? Math.round(resultTokens / total) : 0,
      // What share of everything the model read came from this server. The
      // question "is the MCP server expensive" has no other honest answer.
      ...(llmTokens > 0 && { shareOfLlmTokens: resultTokens / llmTokens }),
      ...(costPerToken !== undefined && {
        costUsd: resultTokens * costPerToken,
        shareOfSessionCost: ratio(resultTokens, llmTokens),
      }),
    },
    tokens: {
      measuredSaved: sum(savedBySource),
      savedBySource,
      // Kept apart, always. See the module note.
      estimatedRouting,
      coreTokens,
      finalTokens,
      // What compression removed, over what it was given. Derived from the
      // measured saving rather than from core-minus-final: the difference
      // between the two ends of post-processing nets compression against the
      // reminder added in the same step, which is why every export reported a
      // compression of zero on results that demonstrably compressed (ADR 074).
      // The reminder's own cost stays in reminderOverhead, below.
      ...(coreTokens > 0 && { cavemanRatio: Math.min(1, (savedBySource.caveman ?? 0) / coreTokens) }),
      // What the reminder cost, from the recorder rather than from the gap
      // between the two ends of post-processing: compression runs in the same
      // step, so the gap is the two netted against each other and reads zero
      // whenever compression removed more than the reminder added. A log
      // written before the field existed has only the gap to offer.
      reminderOverhead: hasReminderTokens ? reminderTokens : Math.max(0, finalTokens - coreTokens),
    },
    guardrails: { failures: guardrailFailures, byRule: guardrailByRule },
    cache: {
      hits: cacheHits,
      hitRate: ratio(cacheHits, total) ?? 0,
      byTier,
      // The two honest facts about a hit: how much output it served, and the
      // recomputation it skipped. The second is small on purpose - this server
      // does no inference, so a miss costs milliseconds, not seconds.
      replayedTokens,
      recomputeSavedMsPerHit: Math.max(0, (percentile(missDurations, 0.5) ?? 0) - (percentile(hitDurations, 0.5) ?? 0)),
    },
    routing: { byTool, bySkill, byEntry, byMode },
    iterations,
    productivity: {
      activeMs,
      avgPerCallMs: total > 0 ? Math.round(activeMs / total) : 0,
      ...(lines > 0 && activeMs > 0 && { linesPerMinute: lines / (activeMs / 60_000) }),
      ...(lines > 0 && iterations.count > 0 && { linesPerPrompt: lines / iterations.count }),
      ...(usage?.costUsd !== undefined &&
        outputTokens > 0 && { costPer1kOutput: (usage.costUsd / outputTokens) * 1000 }),
      ...(usage?.costUsd !== undefined && iterations.count > 0 && { costPerPrompt: usage.costUsd / iterations.count }),
    },
  };
}
