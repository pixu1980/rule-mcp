

/** @module core/enforcement/postprocess - the outbound half: validation and stamps */

import { randomUUID } from "node:crypto";
import { validateResultShape, validateRouterResult } from "./_validate.js";

/**
 * Deterministic post-processing: validates result shape (and router output) and
 * attaches enforcement metadata. Contains NO env- or state-dependent decoration,
 * so its output is safe to cache and replay.
 */
export function postprocessToolResult(name, arguments_, result, context = {}) {
  validateResultShape(result);

  if (!result.isError && name === "rule_tool") {
    validateRouterResult(result, new Set(context.toolNames), new Set(context.skillNames));
  }

  if (result.isError) {
    return result;
  }

  return {
    ...result,
    _meta: {
      ...result._meta,
      ruleEnforcement: {
        policy: "advisory",
        preprocessed: true,
        postprocessed: true,
        tool: name,
        validatedArguments: Object.keys(arguments_ ?? {}).sort(),
      },
    },
  };
}

/**
 * Stamp the per-call identity onto a request after the cache.
 *
 * A core that carries a fresh request id can never match a recompute: two runs
 * of the same call would differ, and a replay would hand back an older call's
 * id. So the id is minted here, at the edge, and only on the response that is
 * actually returned - never inside the stored core (ADR 059).
 *
 * @param {object} result - a postprocessed, de-identified core
 * @param {string} [requestId] - injected by the tests
 * @returns {object} the same result, now carrying its per-call identity
 */
export function stampRequestId(result, requestId = randomUUID()) {
  if (!result || result.isError || !result._meta?.ruleEnforcement) {
    return result;
  }

  return {
    ...result,
    _meta: {
      ...result._meta,
      ruleEnforcement: { requestId, ...result._meta.ruleEnforcement },
    },
  };
}

/** A closed-fail envelope for a pre- or post-processing error. */
export function enforcementError(name, stage, error) {
  return {
    isError: true,
    content: [{ type: "text", text: `PIX enforcement ${stage} blocked ${name}: ${error.message}` }],
    _meta: {
      ruleEnforcement: {
        policy: "advisory",
        stage,
        tool: name,
      },
    },
  };
}
