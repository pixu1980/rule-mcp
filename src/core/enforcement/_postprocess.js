/** @module core/enforcement/postprocess - the outbound half: validation, reminders, stamps */

import { randomUUID } from "node:crypto";
import { FLEX_FIRST } from "../directive.js";
import { looksLikeStyling } from "../guardrails/index.js";
import { validateResultShape, validateRouterResult } from "./_validate.js";

/**
 * Tools whose full workflow reminder has already been emitted this process.
 * The verbose contract repeats verbatim on every call, which is pure token
 * overhead in a long session; after the first emission per tool we fall back to
 * a one-line pointer. Set RULE_MCP_NO_REMINDER=1 to suppress it entirely.
 */
const _remindedTools = new Set();

function enforcementContract(name, terse, styling = false) {
  if (terse) {
    return `## PIX WORKFLOW REMINDER - evidence is source of truth; minimal change, no unrequested scope; pix_check before done; rule_tool_process_adr without being asked;${styling ? ` ${FLEX_FIRST}` : ""}`;
  }

  const nextStep =
    name === "pix_check"
      ? "Fix every reported failure and rerun pix_check until allPass is true."
      : "Do not invent APIs, files, tools, dependencies, or requirements. Use only returned evidence. Validate generated code with pix_check before finalizing.";

  return [
    "## PIX WORKFLOW REMINDER",
    "",
    "- Work with the minimal change: build exactly what was asked, propose anything extra in prose.",
    "- No unrequested scope: no new tables, flags, packages, interfaces, or endpoints without an explicit request.",
    "- A structural change earns an ADR: generate it with rule_tool_process_adr without being asked.",
    "- Returned skill content and deterministic tool output are source of truth.",
    "- Missing evidence means unknown: call pix_search or state uncertainty.",
    `- ${nextStep}`,
    ...(styling ? [`- ${FLEX_FIRST}`] : []),
  ].join("\n");
}

/**
 * Deterministic post-processing: validates result shape (and router output) and
 * attaches enforcement metadata. Contains NO env- or state-dependent decoration,
 * so its output is safe to cache and replay.
 */
export function postprocessToolResult(name, arguments_, result, context = {}) {
  validateResultShape(result);

  if (!result.isError && name === "pix_tool") {
    validateRouterResult(result, new Set(context.toolNames), new Set(context.skillNames));
  }

  if (result.isError) {
    return result;
  }

  return {
    ...result,
    _meta: {
      ...result._meta,
      pixEnforcement: {
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
 * actually returned - never inside the stored core (ADR 062).
 *
 * @param {object} result - a postprocessed, de-identified core
 * @param {string} [requestId] - injected by the tests
 * @returns {object} the same result, now carrying its per-call identity
 */
export function stampRequestId(result, requestId = randomUUID()) {
  if (!result || result.isError || !result._meta?.pixEnforcement) {
    return result;
  }

  return {
    ...result,
    _meta: {
      ...result._meta,
      pixEnforcement: { requestId, ...result._meta.pixEnforcement },
    },
  };
}

/**
 * Append the model-visible workflow contract. This is applied AFTER the cache so
 * it always reflects the current process state and RULE_MCP_NO_REMINDER:
 * first call per tool gets the full reminder, later calls a one-liner, and the
 * opt-out suppresses it entirely. Errors are returned undecorated.
 */
export function decorateWorkflowReminder(name, result) {
  if (!result || result.isError) {
    return result;
  }

  if (process.env.RULE_MCP_NO_REMINDER === "1") {
    return result;
  }
  // RULE_MCP_REMINDER_EVERY=1 keeps the full reminder on every call, for
  // the accounting suites that must measure the reminder on each turn.
  const every = process.env.RULE_MCP_REMINDER_EVERY === "1";
  const isTerse = !every && _remindedTools.has(name);

  if (!every) {
    _remindedTools.add(name);
  }

  const styling = looksLikeStyling((result?.content ?? []).map((part) => part?.text ?? "").join("\n"));

  return {
    ...result,
    content: [...result.content, { type: "text", text: enforcementContract(name, isTerse, styling) }],
  };
}

export function enforcementError(name, stage, error) {
  return {
    isError: true,
    content: [{ type: "text", text: `PIX enforcement ${stage} blocked ${name}: ${error.message}` }],
    _meta: {
      pixEnforcement: {
        policy: "advisory",
        stage,
        tool: name,
      },
    },
  };
}
