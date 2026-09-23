

/** Tool invocation: hooks, cache read-through, banner, telemetry. */
import { _tools } from "../_hooks.js";
import { withBanner } from "../_helpers.js";
import { computeCore } from "../_compute.js";
import { hostBanner, hostBeforeCall } from "./_host.js";
import { enforcementError } from "@src/core/enforcement/index.js";
import { resumeAnnouncement } from "@src/core/session/resume/index.js";
import { touchActivity } from "@src/core/session/_activity.js";
import { z } from "zod/v4";
import { recordCrashed } from "./_telemetry.js";
import { replayIfCached, storeAndFinalize } from "./_stages.js";

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
  // awaited; the banner is consumed below and prepended to the result. The host
  // owns both halves - this module never imports the updater.
  if (name !== "rule_tool_update") {
    try {
      hostBeforeCall(name);
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

  const banner = [hostBanner(), notice].filter(Boolean).join("\n\n");
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
    const replayed = replayIfCached(name, validated, startedAt);

    if (replayed) {
      return withBanner(banner, replayed);
    }

    stage = "preprocessing";
    const { arguments: processedArguments, core } = await computeCore(name, tool, validated);

    stage = "finalize";

    return withBanner(banner, storeAndFinalize(name, processedArguments, core, startedAt));
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((index) => `- ${index.path.join(".")}: ${index.message}`).join("\n");

      return withBanner(banner, { isError: true, content: [{ type: "text", text: `Invalid arguments:\n${issues}` }] });
    }

    recordCrashed({ tool: name, args, startedAt });

    return withBanner(banner, enforcementError(name, stage, error));
  }
}
