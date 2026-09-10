

/** @module core/telemetry/flight/timeline */

import { createHash } from "node:crypto";
import { SERVER_NAME } from "./_constants.js";

/**
 * Deterministic id from a session and an ordinal, so exporting the same log
 * twice produces the same ids. A random id would make every export a new diff.
 *
 * @param {string} session
 * @param {number} index
 * @param {string} suffix
 * @returns {string}
 */
export function eventId(session, index, suffix) {
  return createHash("sha256").update(`${session}:${index}:${suffix}`).digest("hex").slice(0, 24);
}

/**
 * The timeline: a connect event, a call/result pair per recorded call, a
 * disconnect.
 *
 * Each pair shares a `toolCallId`, which is what lets the timeline draw a span
 * with a duration rather than two unrelated points.
 *
 * @param {object[]} events - time-ordered
 * @param {string} windowId
 * @returns {object[]}
 */
export function timelineOf(events, windowId) {
  const startedAt = events[0].ts;
  const endedAt = events.at(-1).ts;
  const transport = events[0].transport ?? "stdio";

  const timeline = [
    {
      id: eventId(windowId, -1, "connected"),
      sessionId: events[0].session,
      type: "mcp-server-connected",
      timestamp: startedAt,
      serverName: SERVER_NAME,
      transport: ["stdio", "sse", "http"].includes(transport) ? transport : "stdio",
    },
  ];

  for (const [index, event] of events.entries()) {
    const toolCallId = eventId(windowId, index, "call");
    const savedTotal = Object.values(event.saved ?? {}).reduce((a, b) => a + (Number(b) || 0), 0);

    timeline.push({
      id: toolCallId,
      sessionId: event.session,
      type: "mcp-tool-call",
      timestamp: event.ts,
      serverName: SERVER_NAME,
      toolName: event.tool,
      toolCallId,
      // Still not the arguments: their size is recorded, their content is not.
      // The prompt is the one exception and it lives in its own block, so a
      // reader who does not want it can drop one key.
      input: {
        ...(!(event.promptLength === undefined) && { promptLength: event.promptLength }),
        ...(!(event.argsBytes === undefined) && { argsBytes: event.argsBytes }),
        ...(event.routedSkill && { routedSkill: event.routedSkill }),
        ...(event.mode && { mode: event.mode }),
        ...(event.resource && { resource: true }),
      },
    });

    timeline.push({
      id: eventId(windowId, index, "result"),
      sessionId: event.session,
      type: "mcp-tool-result",
      timestamp: event.ts + (Number(event.durationMs) || 0),
      serverName: SERVER_NAME,
      toolCallId,
      success: event.ok !== false,
      durationMs: Number(event.durationMs) || 0,
      output: {
        cacheHit: Boolean(event.cacheHit),
        ...(!(event.resultBytes === undefined) && { resultBytes: event.resultBytes }),
        ...(!(event.resultTokensEst === undefined) && { resultTokensEst: event.resultTokensEst }),
        ...(savedTotal > 0 && { tokensSaved: savedTotal }),
        ...(event.estimatedRouting && { tokensSavedEstimated: event.estimatedRouting }),
        ...(typeof event.guardrailFailures === "number" && { guardrailFailures: event.guardrailFailures }),
      },
      metadata: {
        savedBySource: event.saved ?? {},
        ...(event.guardrailRules && { guardrailRules: event.guardrailRules }),
        ...(!(event.coreTokens === undefined) && {
          postProcessing: { core: event.coreTokens, final: event.finalTokens },
        }),
      },
    });
  }

  timeline.push({
    id: eventId(windowId, events.length, "disconnected"),
    sessionId: events.at(-1).session,
    type: "mcp-server-disconnected",
    timestamp: endedAt,
    serverName: SERVER_NAME,
  });

  return timeline;
}
