

/**
 * @module cli/guard/_verdict
 *
 * The answers a guard can give, and the coercion that keeps the file guard out
 * of the permission system (ADR 129).
 */

/** Silent pass-through: the hook says nothing and the tool call proceeds. */
export const ALLOW = { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow" } };

/** Nothing to say: a valid hook answer that neither decides nor injects. */
export const SILENT = {};

/** @param {string} reason @returns {object} */
export const deny = (reason) => ({
  hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason },
});

/** @param {string} reason @returns {object} */
export const ask = (reason) => ({
  hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: reason },
});

/**
 * Report to the model without deciding anything: PostToolUse carries
 * `additionalContext`, which the host appends to the turn and nobody confirms.
 *
 * @param {string} context - what the model should know about the file it wrote
 * @returns {object} hook output
 */
export const advise = (context) => ({
  hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: context },
});

/**
 * Strip every way a hook answer can stop a tool call, so a file guard can only
 * ever report (ADR 129). An `ask` or a `deny` becomes an `allow`; the fields a
 * host reads to block the turn are dropped.
 *
 * @param {object} [answer] - what the write path produced
 * @returns {object} the same answer, unable to block
 */
export function neverBlocks(answer = {}) {
  const rest = { ...answer };

  for (const field of ["decision", "reason", "continue", "stopReason"]) {
    delete rest[field];
  }

  const specific = rest.hookSpecificOutput;

  if (!specific?.permissionDecision) {
    return rest;
  }

  return { ...rest, hookSpecificOutput: { ...specific, permissionDecision: "allow", permissionDecisionReason: "" } };
}
