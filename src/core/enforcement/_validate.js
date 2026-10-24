

/** @module core/enforcement/validate - the shape a result must have before it leaves */

import { MAX_OUTPUT_BYTES } from "./_input.js";

/** Throw unless the result has the MCP content shape and fits the output cap. */
export function validateResultShape(result) {
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

/** Throw when a router answer names a tool or skill that does not exist. */
export function validateRouterResult(result, toolNames, skillNames) {
  let routing;
  try {
    routing = JSON.parse(result.content[0].text);
  } catch {
    throw new Error("rule-mcp router returned invalid JSON");
  }

  const routes = [routing.route, ...(routing.alternatives ?? []).map((item) => item.route)];

  for (const route of routes) {
    // "none" and "unknown" are valid non-skill routes the router emits when no
    // confident match exists - they are not invented skills.
    if (route !== "none" && route !== "unknown" && !skillNames.has(route)) {
      throw new Error(`rule-mcp router invented unknown skill: ${route}`);
    }
  }

  for (const toolName of routing.next_tools ?? []) {
    if (!toolNames.has(toolName)) {
      throw new Error(`rule-mcp router invented unknown tool: ${toolName}`);
    }
  }

  if (typeof routing.confidence !== "number" || routing.confidence < 0 || routing.confidence > 1) {
    throw new Error("rule-mcp router returned invalid confidence");
  }
}
