// Auto-split from src/tools/router.js - see ./router/index.js
/** Result shaping helpers: banner, finalize, token/size estimates, and the skill-independent set. */

import { alignAsciiBoxesResult } from "../../core/ascii-box.js";
import { compressResult } from "../../core/caveman.js";
import { decorateWorkflowReminder, stampRequestId } from "../../core/enforcement.js";
import { stripFingerprintResult } from "../../core/fingerprint.js";
function withBanner(banner, result) {
  if (!banner || !result || !Array.isArray(result.content)) {
    return result;
  }

  return { ...result, content: [{ type: "text", text: banner }, ...result.content] };
}

/**
 * Apply env/state-dependent decoration to a deterministic result core: the
 * workflow reminder (process state + opt-out), then caveman compression, then
 * fingerprint removal, then box alignment (both opt-out). Runs on BOTH cache
 * hits and fresh computes so those toggles always take effect and are never
 * frozen into the cache.
 *
 * Order matters: compression rewrites prose, so the fingerprint pass runs after
 * it and cleans whatever the compressor left behind. Box alignment is last of
 * all - it counts columns, so it has to see the final characters.
 *
 * Both effects are measured at the step that causes them. Reading either as
 * core-minus-final nets them against each other (ADR 074).
 *
 * @param {string} name
 * @param {object} core
 * @returns {{ final: object, cavemanSaved: number, reminderTokens: number }}
 */
function finalize(name, core) {
  const reminded = decorateWorkflowReminder(name, core);
  const compressed = compressResult(reminded);

  return {
    final: stampRequestId(alignAsciiBoxesResult(stripFingerprintResult(compressed))),
    cavemanSaved: Math.max(0, estimateTokens(reminded) - estimateTokens(compressed)),
    reminderTokens: Math.max(0, estimateTokens(reminded) - estimateTokens(core)),
  };
}

/**
 * Rough token count, the char/4 heuristic used everywhere in this project.
 * Every number derived from it is rendered with a tilde for that reason.
 *
 * @param {object} result
 * @returns {number}
 */
function estimateTokens(result) {
  return Math.ceil(textBytes(result) / 4);
}

/** How many characters of text a result actually carries. */
function textBytes(result) {
  return (result?.content ?? []).map((item) => item.text ?? "").join("").length;
}

/** @param {object} args @returns {number} the size of what the caller sent */
function argsBytes(args) {
  try {
    return args === undefined ? 0 : JSON.stringify(args).length;
  } catch {
    return 0;
  }
}

/**
 * Which guardrails failed, as rule id to failure count.
 *
 * @param {object} result
 * @returns {Record<string, number>|undefined}
 */
function guardrailRulesOf(result) {
  const failed = result?._meta?.pixGuardrails?.failed;

  if (!Array.isArray(failed) || failed.length === 0) {
    return;
  }

  return Object.fromEntries(failed.map((rule) => [rule.id, Number(rule.failCount) || 1]));
}

/**
 * Tools that read no skill file, so no skill edit can invalidate their answer.
 *
 * An explicit list, and short. Everything not named here either declares its
 * dependencies below or is treated as depending on all of them, so the failure
 * mode of getting this wrong is invalidating too much - which is what the cache
 * does for every entry it cannot narrow - and never serving a stale answer.
 */
const SKILL_INDEPENDENT = new Set([
  "rule_tool_component", // templates.js
  "rule_tool_compress", // pure text transformation
  "rule_tool_a11y_report", // vendored WCAG criteria
  "rule_tool_stats", // the telemetry log
]);

export { withBanner, finalize, estimateTokens, textBytes, argsBytes, guardrailRulesOf, SKILL_INDEPENDENT };
