

/** @module core/telemetry/recorder/record */

import { pushEvent } from "./_buffer.js";
import { toolCallEvent } from "./_event.js";
import { telemetryEnabled } from "./_flags.js";
import { clientInfo, currentSession } from "./_session.js";

/**
 * Record one tool call.
 *
 * `args` is accepted so the caller does not have to know the recording rules.
 * The prompt is taken from it verbatim when prompts are on and reduced to a
 * length when they are off; nothing else from it is ever stored, only its size.
 *
 * @param {{
 *   tool: string,
 *   args?: object,
 *   durationMs?: number,
 *   ok?: boolean,
 *   cacheHit?: boolean,
 *   cacheTier?: "exact"|"normalized"|"miss",
 *   entry?: "router"|"gateway"|"skill"|"action",
 *   routedSkill?: string,
 *   guardrailFailures?: number,
 *   guardrailRules?: Record<string, number>,
 *   resultBytes?: number,
 *   argsBytes?: number,
 *   coreTokens?: number,
 *   finalTokens?: number,
 *   reminderTokens?: number,
 *   replayedTokens?: number,
 *   mode?: string,
 *   resource?: boolean,
 *   saved?: { cache?: number, caveman?: number, tokensave?: number, estimatedRouting?: number },
 *   path?: string,
 *   now?: number,
 * }} call
 */
export function recordToolCall(call) {
  if (!telemetryEnabled() || !call?.tool) {
    return;
  }

  try {
    pushEvent(toolCallEvent(call, { session: currentSession(), client: clientInfo() }));
  } catch {
    /* never break the call being observed */
  }
}
