

/** @module cli/guard/inject - the context injected into a session start */

import { promptDirective, sessionDirective } from "../../core/index.js";
import { resumeContext } from "../../core/session/resume/index.js";

/**
 * The context-injecting hooks. No decision.
 *
 * The directive is the same whatever the user typed, but the SessionStart
 * payload carries one thing prose cannot know: whether this is a resumed
 * session. When it is, the verified handoff goes in behind the directive, so a
 * user who typed `resume` and nothing else starts where they stopped.
 *
 * @param {"session-start"|"prompt-submit"} kind
 * @param {{ source?: string, cwd?: string }} [payload] - The hook payload, when there is one
 * @returns {object} hook output
 */
export function inject(kind, payload = {}) {
  const hookEventName = kind === "session-start" ? "SessionStart" : "UserPromptSubmit";

  if (kind !== "session-start") {
    const additionalContext = promptDirective();

    return additionalContext ? { hookSpecificOutput: { hookEventName, additionalContext } } : { hookSpecificOutput: { hookEventName } };
  }
  // Directive first: it states how to work, and the handoff is what to work on.
  const additionalContext = [sessionDirective(), resumeContext(payload)].filter(Boolean).join("\n\n");

  return additionalContext ? { hookSpecificOutput: { hookEventName, additionalContext } } : { hookSpecificOutput: { hookEventName } };
}
