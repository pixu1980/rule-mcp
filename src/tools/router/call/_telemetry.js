

/** The three recorded shapes of one tool call, folded into one place. */
import { argsBytes, estimateTokens, guardrailRulesOf, textBytes } from "../_helpers.js";
import { entryPathOf, routedSkillOf } from "../_entry.js";
import { recordToolCall } from "../../../core/telemetry/recorder/index.js";

/** Record a call answered from the cache (a replay, decorated like a miss). */
export function recordHit({ tool, args, startedAt, cached, final, cavemanSaved, reminderTokens }) {
  recordToolCall({
    tool,
    args,
    durationMs: Date.now() - startedAt,
    ok: true,
    cacheHit: true,
    cacheTier: cached.tier,
    entry: entryPathOf(tool),
    mode: args?.mode,
    argsBytes: argsBytes(args),
    resultBytes: textBytes(final),
    coreTokens: estimateTokens(cached.result),
    finalTokens: estimateTokens(final),
    reminderTokens,
    replayedTokens: estimateTokens(cached.result),
    saved: { caveman: cavemanSaved },
  });
}

/** Record a fresh compute that succeeded. */
export function recordMiss({ tool, args, startedAt, core, final, cavemanSaved, reminderTokens, estimatedRouting, guardrailFailures, guardrailRules }) {
  recordToolCall({
    tool,
    args,
    durationMs: Date.now() - startedAt,
    ok: true,
    cacheHit: false,
    cacheTier: "miss",
    entry: entryPathOf(tool),
    routedSkill: routedSkillOf(tool, core),
    mode: args?.mode,
    argsBytes: argsBytes(args),
    resultBytes: textBytes(final),
    coreTokens: estimateTokens(core),
    finalTokens: estimateTokens(final),
    guardrailFailures,
    guardrailRules,
    saved: { caveman: cavemanSaved },
    reminderTokens,
    estimatedRouting,
  });
}

/** Record a call whose core was an error, keeping the guardrail count. */
export function recordFailure({ tool, args, startedAt, core }) {
  recordToolCall({
    tool,
    args,
    durationMs: Date.now() - startedAt,
    ok: false,
    cacheHit: false,
    cacheTier: "miss",
    entry: entryPathOf(tool),
    mode: args?.mode,
    argsBytes: argsBytes(args),
    resultBytes: textBytes(core),
    guardrailFailures: core?._meta?.pixGuardrails?.failCount,
    guardrailRules: guardrailRulesOf(core),
  });
}

/** Record a call that blew up during validation or preprocessing. */
export function recordCrashed({ tool, args, startedAt }) {
  recordToolCall({
    tool,
    args,
    durationMs: Date.now() - startedAt,
    ok: false,
    cacheHit: false,
    cacheTier: "miss",
    entry: entryPathOf(tool),
    argsBytes: argsBytes(args),
  });
}
