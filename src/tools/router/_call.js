/** Tool invocation entry: hooks, cache read-through, self-update banner, telemetry, compress-ascii-fingerprint post. */

import { _afterHooks, _tools } from "./_hooks.js";
import { argsBytes, estimateTokens, finalize, guardrailRulesOf, textBytes, withBanner } from "./_helpers.js";
import { cacheLookup, cacheStore } from "../../core/cache/_tool-cache.js";
import { computeCore, estimateRoutingSaving } from "./_compute.js";
import { consumeUpdateBanner, maybeSelfUpdate } from "../../core/self-update.js";
import { dependenciesOf, entryPathOf, routedSkillOf } from "./_entry.js";
import { enforcementError } from "../../core/enforcement.js";
import { recordToolCall } from "../../core/telemetry/_telemetry.js";
import { resumeAnnouncement } from "../../core/session/_resume.js";
import { touchActivity } from "../../core/session/_reclaim.js";
import { z } from "zod/v4";
async function callTool(name, args) {
  // A call is the only evidence that anyone still wants this process's heap.
  // Recorded before anything else, so even a call that fails validation counts
  // as use and postpones the idle reclaim.
  try {
    touchActivity();
  } catch {
    /* fail-open */
  }

  // ── Self-update: throttled fire-and-forget check on every invocation, kicked
  // BEFORE the cache lookup (so a cache hit can't skip it) and BEFORE tool
  // lookup (a skills reload re-registers _tools). NOT awaited: the tool
  // responds immediately; the banner of a completed background check is
  // consumed below and prepended to this result. pix_update runs its own
  // update. ──
  if (name !== "rule_tool_update") {
    try {
      maybeSelfUpdate();
    } catch {
      /* fail-open */
    }
  }
  // A harness that spells resume as the user's first message fires no hook, so
  // the prompt is the signal (core/resume). Applied here, beside the banner, and
  // deliberately not inside the cached core: a stored result must never carry a
  // snapshot of a repository that has since moved.
  let notice = "";
  try {
    notice = resumeAnnouncement({ prompt: args?.prompt, cwd: process.cwd() });
  } catch {
    /* fail-open */
  }

  const banner = [consumeUpdateBanner(), notice].filter(Boolean).join("\n\n");

  const tool = _tools.find((t) => t.name === name);

  if (!tool) {
    return withBanner(banner, { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] });
  }

  let stage = "validation";
  const startedAt = Date.now();
  try {
    const validated = tool.zodSchema ? tool.zodSchema.parse(args) : args;

    // ── Deterministic recycle: replay a cached result for read-only tools ──
    // The server never calls a model, so an identical (tool, args) call always
    // produces the same output. Serve it from cache instead of recomputing.
    stage = "cache";
    const cached = cacheLookup(name, validated);

    if (cached) {
      // Which tier answered is reported to the caller, not only to telemetry: a
      // cache that cannot say where an answer came from is one nobody can debug.
      const replay = { ...cached.result, _meta: { ...cached.result._meta, pixCache: { tier: cached.tier } } };
      // A hit goes through the same decoration as a miss, so it reports both.
      // Recording only the cache saving made every token figure a lower bound
      // on a cache-warm session (ADR 074).
      const { final, cavemanSaved, reminderTokens } = finalize(name, replay);

      recordToolCall({
        tool: name,
        args: validated,
        durationMs: Date.now() - startedAt,
        ok: true,
        cacheHit: true,
        cacheTier: cached.tier,
        entry: entryPathOf(name),
        mode: validated?.mode,
        argsBytes: argsBytes(validated),
        resultBytes: textBytes(final),
        coreTokens: estimateTokens(cached.result),
        finalTokens: estimateTokens(final),
        reminderTokens,
        replayedTokens: estimateTokens(cached.result),
        saved: { caveman: cavemanSaved },
      });

      return withBanner(banner, final);
    }

    stage = "preprocessing";
    const computed = await computeCore(name, tool, validated);
    const { arguments: processedArguments, core } = computed;

    stage = "finalize";

    if (!core?.isError) {
      // Cache the deterministic core (reminder + caveman + fingerprint are
      // re-applied per call).
      cacheStore(name, processedArguments, core, dependenciesOf(name, processedArguments, core));
      const { final, cavemanSaved, reminderTokens } = finalize(name, core);
      recordToolCall({
        tool: name,
        args: processedArguments,
        durationMs: Date.now() - startedAt,
        ok: true,
        cacheHit: false,
        cacheTier: "miss",
        entry: entryPathOf(name),
        routedSkill: routedSkillOf(name, core),
        mode: processedArguments?.mode,
        argsBytes: argsBytes(processedArguments),
        resultBytes: textBytes(final),
        coreTokens: estimateTokens(core),
        finalTokens: estimateTokens(final),
        guardrailFailures: core?._meta?.pixGuardrails?.failCount,
        guardrailRules: guardrailRulesOf(core),
        saved: { caveman: cavemanSaved },
        reminderTokens,
        estimatedRouting: estimateRoutingSaving(name, core, final),
      });
      const hooks = [...(_afterHooks["*"] || []), ...(_afterHooks[name] || [])];

      for (const function_ of hooks) {
        function_(name, processedArguments, final).catch(() => {});
      }

      return withBanner(banner, final);
    }

    // A failing guardrail check IS an error result, so the count has to be read
    // here too - otherwise the number is only ever recorded when it is zero.
    recordToolCall({
      tool: name,
      args: processedArguments,
      durationMs: Date.now() - startedAt,
      ok: false,
      cacheHit: false,
      cacheTier: "miss",
      entry: entryPathOf(name),
      mode: processedArguments?.mode,
      argsBytes: argsBytes(processedArguments),
      resultBytes: textBytes(core),
      guardrailFailures: core?._meta?.pixGuardrails?.failCount,
      guardrailRules: guardrailRulesOf(core),
    });

    return withBanner(banner, finalize(name, core).final);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((index) => `- ${index.path.join(".")}: ${index.message}`).join("\n");

      return withBanner(banner, { isError: true, content: [{ type: "text", text: `Invalid arguments:\n${issues}` }] });
    }

    recordToolCall({
      tool: name,
      args,
      durationMs: Date.now() - startedAt,
      ok: false,
      cacheHit: false,
      cacheTier: "miss",
      entry: entryPathOf(name),
      argsBytes: argsBytes(args),
    });

    return withBanner(banner, enforcementError(name, stage, error));
  }
}

/**
 * Read the SKILL.md file for a given skill name.
 *
 * The bundled `skills/` directory is the only source: giving the home skills
 * dir precedence would let a directory in the user's home silently replace the
 * content this server ships under the same tool name.
 *
 * @param {string} skillName - e.g. "rule-frontend-react", "rule-styleguide"
 * @returns {string|null} - The full SKILL.md content, or null if not found
 */

export { callTool };
