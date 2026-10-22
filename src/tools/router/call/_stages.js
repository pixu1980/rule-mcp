

/** callTool's two heavy stages, split out so the orchestrator stays a thin sequence. */
import { finalize, guardrailRulesOf } from "../_helpers.js";
import { cacheLookup, cacheStore } from "@src/core/cache/tool-cache/index.js";
import { estimateRoutingSaving } from "../_compute.js";
import { dependenciesOf } from "../_entry.js";
import { recordFailure, recordHit, recordMiss } from "./_telemetry.js";
import { runAfterHooks } from "./_after.js";

/**
 * A deterministic cache hit, redecorated and recorded.
 *
 * @param {string} name
 * @param {object} validated
 * @param {number} startedAt
 * @returns {{ isError?: boolean, content: Array<{ type: string, text: string }> } | undefined} the final response, or undefined on a miss
 */
export function replayIfCached(name, validated, startedAt) {
  const cached = cacheLookup(name, validated);

  if (!cached) {
    return;
  }

  const replay = { ...cached.result, _meta: { ...cached.result._meta, pixCache: { tier: cached.tier } } };
  const { final, compressionSaved, reminderTokens } = finalize(name, replay);

  recordHit({ tool: name, args: validated, startedAt, cached, final, compressionSaved, reminderTokens });

  return final;
}

/**
 * Store a fresh deterministic core, decorate it, record the outcome, and run
 * after-hooks on success; record and decorate a guardrail failure otherwise.
 *
 * @param {string} name
 * @param {object} processedArguments
 * @param {object} core
 * @param {number} startedAt
 * @returns {{ isError?: boolean, content: Array<{ type: string, text: string }> }}
 */
export function storeAndFinalize(name, processedArguments, core, startedAt) {
  if (!core?.isError) {
    cacheStore(name, processedArguments, core, dependenciesOf(name, processedArguments, core));
    const { final, compressionSaved, reminderTokens } = finalize(name, core);

    recordMiss({
      tool: name,
      args: processedArguments,
      startedAt,
      core,
      final,
      compressionSaved,
      reminderTokens,
      estimatedRouting: estimateRoutingSaving(name, core, final),
      guardrailFailures: core?._meta?.pixGuardrails?.failCount,
      guardrailRules: guardrailRulesOf(core),
    });
    runAfterHooks(name, processedArguments, final);

    return final;
  }

  // A failing guardrail check IS an error result, so its count still has to be recorded here.
  recordFailure({ tool: name, args: processedArguments, startedAt, core });

  return finalize(name, core).final;
}
