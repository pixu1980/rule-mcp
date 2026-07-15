import { randomUUID } from "node:crypto";

const MAX_ARGUMENT_BYTES = 256 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_DEPTH = 12;
const MAX_KEYS = 1000;
const NORMALIZED_FIELDS = new Set(["prompt", "query", "skill", "framework", "mode", "path", "title", "file", "fileName"]);
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function assertSafeValue(value, state, depth = 0) {
  if (depth > MAX_DEPTH) throw new Error(`argument nesting exceeds ${MAX_DEPTH}`);
  if (typeof value === "string") {
    if (value.includes("\0")) throw new Error("arguments contain NUL control characters");
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) assertSafeValue(item, state, depth + 1);
    return;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error("arguments must use plain objects");
  for (const [key, child] of Object.entries(value)) {
    state.keys += 1;
    if (state.keys > MAX_KEYS) throw new Error(`arguments exceed ${MAX_KEYS} keys`);
    if (FORBIDDEN_KEYS.has(key)) throw new Error(`forbidden argument key: ${key}`);
    assertSafeValue(child, state, depth + 1);
  }
}

function normalizeArguments(args) {
  const normalized = { ...args };
  for (const field of NORMALIZED_FIELDS) {
    if (typeof normalized[field] === "string") normalized[field] = normalized[field].trim();
  }
  return normalized;
}

export function preprocessToolCall(name, args) {
  const serialized = JSON.stringify(args ?? {});
  if (Buffer.byteLength(serialized, "utf8") > MAX_ARGUMENT_BYTES) {
    throw new Error(`arguments exceed ${MAX_ARGUMENT_BYTES} bytes`);
  }
  assertSafeValue(args ?? {}, { keys: 0 });
  const normalized = normalizeArguments(args ?? {});
  if (name === "pix" && !normalized.prompt) throw new Error("pix requires a non-blank prompt");
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
    if (item.text.includes("\0")) throw new Error("tool returned NUL control characters");
    outputBytes += Buffer.byteLength(item.text, "utf8");
  }
  if (outputBytes > MAX_OUTPUT_BYTES) throw new Error(`tool output exceeds ${MAX_OUTPUT_BYTES} bytes`);
}

function validateRouterResult(result, toolNames, skillNames) {
  let routing;
  try {
    routing = JSON.parse(result.content[0].text);
  } catch {
    throw new Error("pix router returned invalid JSON");
  }
  const routes = [routing.route, ...(routing.alternatives ?? []).map((item) => item.route)];
  for (const route of routes) {
    if (route !== "none" && !skillNames.has(route)) throw new Error(`pix router invented unknown skill: ${route}`);
  }
  for (const toolName of routing.next_tools ?? []) {
    if (!toolNames.has(toolName)) throw new Error(`pix router invented unknown tool: ${toolName}`);
  }
  if (typeof routing.confidence !== "number" || routing.confidence < 0 || routing.confidence > 1) {
    throw new Error("pix router returned invalid confidence");
  }
}

function enforcementContract(name) {
  const nextStep = name === "pix_check"
    ? "Fix every reported failure and rerun pix_check until allPass is true."
    : "Do not invent APIs, files, tools, dependencies, or requirements. Use only returned evidence. Validate generated code with pix_check before finalizing.";
  return [
    "## PIX WORKFLOW REMINDER",
    "",
    "- Returned skill content and deterministic tool output are source of truth.",
    "- Missing evidence means unknown: call pix_search or state uncertainty.",
    `- ${nextStep}`,
  ].join("\n");
}

export function postprocessToolResult(name, args, result, context = {}) {
  validateResultShape(result);
  if (!result.isError && name === "pix") {
    validateRouterResult(result, new Set(context.toolNames ?? []), new Set(context.skillNames ?? []));
  }
  if (result.isError) return result;

  const requestId = context.requestId ?? randomUUID();
  return {
    ...result,
    content: [...result.content, { type: "text", text: enforcementContract(name) }],
    _meta: {
      ...(result._meta ?? {}),
      pixEnforcement: {
        requestId,
        policy: "advisory",
        preprocessed: true,
        postprocessed: true,
        tool: name,
        validatedArguments: Object.keys(args ?? {}).sort(),
      },
    },
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
