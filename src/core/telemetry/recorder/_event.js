/** @module core/telemetry/recorder/event */

import { promptsEnabled } from "./_flags.js";
import { installationId, projectId } from "./_identity.js";

/**
 * Build the event row for one tool call, applying the recording rules.
 *
 * @param {object} call - see recordToolCall for the accepted fields
 * @param {{ session?: { id: string, transport: string }, client?: string }} context
 * @returns {object}
 */
export function toolCallEvent(call, context = {}) {
  const { session, client } = context;
  const { estimatedRouting, ...measured } = call.saved ?? {};
  const event = {
    ts: call.now ?? Date.now(),
    session: session?.id ?? "unknown",
    installation: installationId(),
    transport: session?.transport ?? "stdio",
    project: projectId(),
    tool: call.tool,
    durationMs: Number(call.durationMs) || 0,
    ok: call.ok !== false,
    cacheHit: Boolean(call.cacheHit),
  };
  // Which tier answered, and which path the call arrived on. Both are facets
  // of the call, not content, so neither touches the privacy contract below.
  if (call.cacheTier) {
    event.cacheTier = call.cacheTier;
  }

  if (call.entry) {
    event.entry = call.entry;
  }
  // The length is always kept, because it is the one prompt number that is
  // still there when the text has been switched off.
  const prompt = typeof call.args?.prompt === "string" ? call.args.prompt : undefined;

  if (prompt !== undefined) {
    event.promptLength = prompt.length;

    if (promptsEnabled()) {
      event.prompt = prompt;
    }
  }

  if (call.routedSkill) {
    event.routedSkill = call.routedSkill;
  }

  if (client) {
    event.client = client;
  }

  if (call.mode) {
    event.mode = call.mode;
  }
  // A resource read is not a tool call, and counting them together hides the
  // "read the whole skill file" strategy behind the "call the tool" one.
  if (call.resource) {
    event.resource = true;
  }
  // What this call weighed, in both directions. Bytes are what was measured;
  // the token figure beside them is the char/4 heuristic used project-wide,
  // kept as a field so no reader has to re-derive it.
  const resultBytes = Number(call.resultBytes) || 0;

  if (resultBytes > 0) {
    event.resultBytes = resultBytes;
    event.resultTokensEst = Math.ceil(resultBytes / 4);
  }

  const argsBytes = Number(call.argsBytes) || 0;

  if (argsBytes > 0) {
    event.argsBytes = argsBytes;
    event.argsTokensEst = Math.ceil(argsBytes / 4);
  }
  // Both ends of post-processing, not only the difference: caveman shrinks the
  // core result and the workflow reminder grows it again, and a ratio cannot
  // be recovered from a single saving figure. Named after what they are, not
  // after one of the two effects - calling the pair "caveman" produced a
  // compression percentage that went negative whenever the reminder won.
  if (typeof call.coreTokens === "number" && typeof call.finalTokens === "number") {
    event.coreTokens = call.coreTokens;
    event.finalTokens = call.finalTokens;
  }
  // What the reminder itself weighed, measured where it is appended. The pair
  // above cannot answer it: compression runs in the same step and the
  // difference is the two effects netted against each other.
  if (typeof call.reminderTokens === "number") {
    event.reminderTokens = call.reminderTokens;
  }
  // What a hit replayed. Recorded apart from `saved` because it is output the
  // model still reads, not a saving (ADR 079).
  if (typeof call.replayedTokens === "number") {
    event.replayedTokens = call.replayedTokens;
  }

  if (typeof call.guardrailFailures === "number") {
    event.guardrailFailures = call.guardrailFailures;
  }
  // Which rule failed, not just how many did. A count says a check went red;
  // only the rule ids say what the code actually got wrong.
  if (call.guardrailRules && Object.keys(call.guardrailRules).length > 0) {
    event.guardrailRules = call.guardrailRules;
  }

  if (Object.keys(measured).length > 0) {
    event.saved = measured;
  }
  // Estimated, and kept apart on purpose: merging it would inflate a measured
  // total with a guess, and the guess is the biggest number of the three.
  // Accepted at the top level or inside `saved`: callers think of it as a
  // saving, and it is stripped out of the measured bucket either way.
  // Zero is a result, not a missing value: a small skill can cost less than
  // the router's own answer, and dropping the zero made "routing saved
  // nothing here" indistinguishable from "nothing was estimated".
  const declared = call.estimatedRouting ?? estimatedRouting;

  if (declared !== undefined) {
    event.estimatedRouting = Number(declared) || 0;
  }

  if (call.path) {
    event.path = call.path;
  }

  return event;
}
