/** Tool invocation: hooks, cache read-through, banner, telemetry. */
import { _tools } from "../_hooks.js";
import { estimateTokens, finalize, withBanner } from "../_helpers.js";
import { cacheLookup, cacheStore } from "@src/core/cache/tool-cache/index.js";
import { computeCore, estimateRoutingSaving } from "../_compute.js";
import { consumeUpdateBanner, maybeSelfUpdate } from "@src/core/self-update/index.js";
import { dependenciesOf } from "../_entry.js";
import { enforcementError } from "@src/core/enforcement/index.js";
import { resumeAnnouncement } from "@src/core/session/resume/index.js";
import { touchActivity } from "@src/core/session/_reclaim.js";
import { guardrailRulesOf } from "../_helpers.js";
import { z } from "zod/v4";
import { runAfterHooks } from "./_after.js";
import { recordCrashed, recordFailure, recordHit, recordMiss } from "./_telemetry.js";

/**
 * Run one tool call end to end: activity, self-update, resume banner, cache
 * replay or fresh compute, telemetry, and the closed-fail envelope.
 *
 * @param {string} name
 * @param {object} args
 * @returns {Promise<{ isError?: boolean, content: Array<{ type: string, text: string }> }>}
 */
export async function callTool(name, args) {
  // A call is the only evidence that anyone still wants this process's heap.
  try {
    touchActivity();
  } catch {
    /* fail-open */
  }

  // Self-update: throttled fire-and-forget, kicked before the cache lookup, NOT
  // awaited; the banner is consumed below and prepended to the result.
  if (name !== "rule_tool_update") {
    try {
      maybeSelfUpdate();
    } catch {
      /* fail-open */
    }
  }

  // A resume prompt carries no hook, so the prompt is the signal; the notice is
  // applied here, beside the banner, never inside a cached core.
  let notice = "";
  try {
    notice = resumeAnnouncement({ prompt: args?.prompt, cwd: process.cwd() });
  } catch {
    /* fail-open */
  }

  const banner = [consumeUpdateBanner(), notice].filter(Boolean).join("\n\n");
  const tool = _tools.find((entry) => entry.name === name);

  if (!tool) {
    return withBanner(banner, { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] });
  }

  let stage = "validation";
  const startedAt = Date.now();

  try {
    const validated = tool.zodSchema ? tool.zodSchema.parse(args) : args;

    // Deterministic recycle: the server never calls a model, so an identical
    // call produces the same output - replay it instead of recomputing. The
    // tier that answered is reported, because a cache nobody can explain is a
    // cache nobody debugs.
    stage = "cache";
    const cached = cacheLookup(name, validated);

    if (cached) {
      const replay = { ...cached.result, _meta: { ...cached.result._meta, pixCache: { tier: cached.tier } } };
      const { final, cavemanSaved, reminderTokens } = finalize(name, replay);
      recordHit({ tool: name, args: validated, startedAt, cached, final, cavemanSaved, reminderTokens });

      return withBanner(banner, final);
    }

    stage = "preprocessing";
    const computed = await computeCore(name, tool, validated);
    const { arguments: processedArguments, core } = computed;

    stage = "finalize";

    if (!core?.isError) {
      // Cache the deterministic core; the reminder/compression/fingerprint
      // decoration is re-applied per call.
      cacheStore(name, processedArguments, core, dependenciesOf(name, processedArguments, core));
      const { final, cavemanSaved, reminderTokens } = finalize(name, core);
      recordMiss({
        tool: name,
        args: processedArguments,
        startedAt,
        core,
        final,
        cavemanSaved,
        reminderTokens,
        estimatedRouting: estimateRoutingSaving(name, core, final),
        guardrailFailures: core?._meta?.pixGuardrails?.failCount,
        guardrailRules: guardrailRulesOf(core),
      });
      runAfterHooks(name, processedArguments, final);

      return withBanner(banner, final);
    }

    // A failing guardrail check IS an error result, so its count still has to
    // be recorded here.
    recordFailure({ tool: name, args: processedArguments, startedAt, core });

    return withBanner(banner, finalize(name, core).final);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((index) => `- ${index.path.join(".")}: ${index.message}`).join("\n");

      return withBanner(banner, { isError: true, content: [{ type: "text", text: `Invalid arguments:\n${issues}` }] });
    }

    recordCrashed({ tool: name, args, startedAt });

    return withBanner(banner, enforcementError(name, stage, error));
  }
}
