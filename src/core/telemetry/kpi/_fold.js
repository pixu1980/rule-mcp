/** @module core/telemetry/kpi/fold */

/**
 * Fold the raw events into the counters computeKpi assembles from.
 *
 * @param {object[]} events
 * @returns {object} the accumulated counters and duration samples
 */
export function foldEvents(events) {
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

  return {
    byTool,
    bySkill,
    byTier,
    byEntry,
    byMode,
    guardrailByRule,
    savedBySource,
    errors,
    cacheHits,
    resources,
    guardrailFailures,
    resultBytes,
    resultTokens,
    argsBytes,
    argsTokens,
    coreTokens,
    finalTokens,
    reminderTokens,
    hasReminderTokens,
    estimatedRouting,
    replayedTokens,
    durations,
    hitDurations,
    missDurations,
  };
}
