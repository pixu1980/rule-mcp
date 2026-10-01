

/** Registered-tool inventory: mutation classification, annotations, declared and public tool lists. */

import { compressText } from "../../core/text/_compression.js";
import { compressionEnabled } from "../../core/text/_level.js";
import { resolveToolName } from "./_contract.js";
import { _tools, toolsGeneration } from "./_hooks.js";

const MUTATING_TOOLS = new Set([
  "rule_tool_apply",
  "rule_tool_fix",
  "rule_tool_process_adr",
  "rule_tool_impersonation",
  "rule_tool_handoff",
  "rule_tool_update",
  "rule_tool_handon",
  "rule_tool_init",
]);

/** Tools whose answer depends on state outside their arguments, so a repeat
 * call can legitimately differ: the working tree, the clock, the code graph. */
const NON_IDEMPOTENT_READS = new Set(["rule_tool_detect", "rule_tool_gateway", "rule_tool_stats", "rule_tool_usage", "rule_tool_handon", "rule_tool_init"]);

/**
 * MCP tool annotations, emitting only what differs from the spec defaults.
 *
 * The defaults are readOnlyHint: false and idempotentHint: false, so a
 * mutating tool needs no annotation at all (client treats it as read-write).
 *
 * @param {string} name
 * @returns {object|undefined}
 */
function annotationsFor(name) {
  // A renamed tool is classified under the name that answers for it today, so a
  // rename cannot leave its annotations behind.
  const { name: current } = resolveToolName(name);

  if (MUTATING_TOOLS.has(current)) {
    return;
  }

  return NON_IDEMPOTENT_READS.has(current) ? { readOnlyHint: true } : { readOnlyHint: true, idempotentHint: true };
}

/**
 * The raw registered tool definitions (including zodSchema and annotations),
 * for audits that need more than the advertised surface.
 *
 * @returns {Array<object>}
 */
function declaredTools() {
  return _tools;
}

let memo = { generation: -1, tools: [], compress: null };

/**
 * List all registered tools with their names, descriptions, and input schemas.
 * Converts Zod schemas to JSON Schema via the built-in toJSONSchema() method.
 *
 * Memoized on the registry generation AND the compression state: the conversion
 * is deterministic and the registry does not change between client connects, so
 * it is paid once per process instead of once per `tools/list`.
 *
 * The description is prose the model reads on every turn to choose a tool, so
 * it goes through the same compression pass as tool results; names, schemas and
 * annotations are the machine contract and are left untouched (ADR 077).
 *
 * @returns {Array<{ name: string, description: string, inputSchema: object }>}
 */
function listTools() {
  const generation = toolsGeneration();

  const compress = compressionEnabled();

  if (memo.generation === generation && memo.compress === compress) {
    return memo.tools;
  }

  const tools = _tools.map((t) => {
    let inputSchema = t.inputSchema ?? { type: "object", properties: {} };

    // If a Zod schema is provided, convert it to JSON Schema
    if (t.zodSchema) {
      try {
        const jsonSchema = t.zodSchema.toJSONSchema();
        // Properties with .default() should not be in required
        // because the server fills them in automatically
        const hasDefault = new Set(
          Object.entries(jsonSchema.properties ?? {})
            .filter(([, v]) => v && typeof v === "object" && "default" in v)
            .map(([k]) => k),
        );
        const required = (jsonSchema.required ?? []).filter((k) => !hasDefault.has(k));
        inputSchema = {
          type: jsonSchema.type ?? "object",
          properties: jsonSchema.properties ?? {},
          required,
        };
      } catch {
        // Fall back to plain inputSchema if conversion fails
      }
    }

    const annotations = annotationsFor(t.name);

    const description = compress ? compressText(String(t.description ?? "")) : String(t.description ?? "");

    return annotations ? { name: t.name, description, inputSchema, annotations } : { name: t.name, description, inputSchema };
  });

  memo = { generation, compress, tools };

  return tools;
}

/**
 * Execute a tool by name with the given arguments.
 * Validates args against the tool's Zod schema (if provided) before calling the handler.
 *
 * @param {string} name - Tool name (e.g. "pix_tool", "rule_tool_frontend_react")
 * @param {object} args - Tool-specific arguments
 * @returns {Promise<{ isError?: boolean, content: Array<{ type: string, text: string }> }>}
 */

export { declaredTools, listTools };
