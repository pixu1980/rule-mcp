import { randomUUID } from "node:crypto";
import { FLEX_FIRST } from "./directive.js";
import { looksLikeStyling } from "./guardrail-defs.js";

const MAX_ARGUMENT_BYTES = 256 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_DEPTH = 12;
const MAX_KEYS = 1000;
const NORMALIZED_FIELDS = new Set([
  "prompt",
  "query",
  "skill",
  "framework",
  "mode",
  "path",
  "title",
  "file",
  "fileName",
]);
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function assertSafeValue(value, state, depth = 0) {
  if (depth > MAX_DEPTH) {
    throw new Error(`argument nesting exceeds ${MAX_DEPTH}`);
  }

  if (typeof value === "string") {
    if (value.includes("\0")) {
      throw new Error("arguments contain NUL control characters");
    }

    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      assertSafeValue(item, state, depth + 1);
    }

    return;
  }

  const prototype = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("arguments must use plain objects");
  }

  for (const [key, child] of Object.entries(value)) {
    state.keys += 1;

    if (state.keys > MAX_KEYS) {
      throw new Error(`arguments exceed ${MAX_KEYS} keys`);
    }

    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`forbidden argument key: ${key}`);
    }

    assertSafeValue(child, state, depth + 1);
  }
}

function normalizeArguments(arguments_) {
  const normalized = { ...arguments_ };

  for (const field of NORMALIZED_FIELDS) {
    if (typeof normalized[field] === "string") {
      normalized[field] = normalized[field].trim();
    }
  }

  return normalized;
}

/**
 * Preprocess arguments before handler execution.
 *
 * @param {string} name - Tool name
 * @param {object} arguments_ - Raw arguments
 * @returns {object} preprocessed arguments
 */
export function preprocessToolCall(name, arguments_) {
  const serialized = JSON.stringify(arguments_ ?? {});

  if (Buffer.byteLength(serialized, "utf8") > MAX_ARGUMENT_BYTES) {
    throw new Error(`arguments exceed ${MAX_ARGUMENT_BYTES} bytes`);
  }

  assertSafeValue(arguments_ ?? {}, { keys: 0 });
  const normalized = normalizeArguments(arguments_ ?? {});

  if (name === "pix_tool" && !normalized.prompt) {
    throw new Error("pix_tool requires a non-blank prompt");
  }

  return normalized;
}

function validateResultShape(result) {
  if (!result || typeof result !== "object" || !Array.isArray(result.content) || result.content.length === 0) {
    throw new Error("tool returned invalid MCP content");
  }

  let outputBytes = 0;

  for (const item of result.content) {
    if (!item || item.type !== "text" || typeof item.text !== "string") {
      throw new Error("tool returned unsupported non-text content");
    }

    if (item.text.includes("\0")) {
      throw new Error("tool returned NUL control characters");
    }

    outputBytes += Buffer.byteLength(item.text, "utf8");
  }

  if (outputBytes > MAX_OUTPUT_BYTES) {
    throw new Error(`tool output exceeds ${MAX_OUTPUT_BYTES} bytes`);
  }
}

function validateRouterResult(result, toolNames, skillNames) {
  let routing;
  try {
    routing = JSON.parse(result.content[0].text);
  } catch {
    throw new Error("rule router returned invalid JSON");
  }

  const routes = [routing.route, ...(routing.alternatives ?? []).map((item) => item.route)];

  for (const route of routes) {
    // "none" and "unknown" are valid non-skill routes the router emits when no
    // confident match exists - they are not invented skills.
    if (route !== "none" && route !== "unknown" && !skillNames.has(route)) {
      throw new Error(`rule router invented unknown skill: ${route}`);
    }
  }

  for (const toolName of routing.next_tools ?? []) {
    if (!toolNames.has(toolName)) {
      throw new Error(`rule router invented unknown tool: ${toolName}`);
    }
  }

  if (typeof routing.confidence !== "number" || routing.confidence < 0 || routing.confidence > 1) {
    throw new Error("rule router returned invalid confidence");
  }
}

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
