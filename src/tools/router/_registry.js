/** The tool registry: state, registration, retention and generation. */
import { IS_MINIMAL_TOOLS, MINIMAL_ALLOWLIST } from "../../core/skills/_minimal.js";

/** The entries a tool may declare. */
const ENTRIES = new Set(["router", "gateway", "skill", "action"]);

const _tools = [];

/**
 * Bumped by every mutation of the registry.
 *
 * `listTools()` converts 105 Zod schemas to JSON Schema, which costs ~8 ms and
 * produces the same answer until the registry changes. stdio spawns a process
 * per client, but a daemon serves many connects from one process and paid that
 * conversion on each of them. The counter is what makes the memo safe: a
 * register, clear or retain invalidates it by construction.
 */
let _generation = 0;

/** @returns {number} the current registry generation. */
function toolsGeneration() {
  return _generation;
}

/**
 * Retain only tools whose name is in `allowed`; drop the rest. Used by the
 * minimal tool-surface mode to guarantee a small, fixed registry regardless of
 * how many tools were registered upstream.
 *
 * @param {Set<string>|Iterable<string>} allowed
 */
function retainTools(allowed) {
  const keep = allowed instanceof Set ? allowed : new Set(allowed);

  for (let index = _tools.length - 1; index >= 0; index--) {
    if (!keep.has(_tools[index].name)) {
      _tools.splice(index, 1);
    }
  }

  _generation += 1;
}

/**
 * Register a tool definition.
 *
 * `entry` is required and declared rather than derived from the name, so a name
 * that no longer maps to a skill cannot silently classify as an action.
 *
 * In minimal mode a tool outside the allowlist is never registered at all, so
 * the surface is never built only to be cut down afterwards.
 *
 * A tool name is the MCP wire contract and must be unique: registering a name
 * that is already present replaces it in place. The core tools are registered
 * from two entry points in one process - the CLI `preAction` hook and
 * `startServer` - so a blind push would advertise `rule_tool_gateway` and
 * `rule_tool_apply` twice, and every MCP client would have to dedupe them.
 *
 * @param {{
 *   name: string,
 *   entry: "router"|"gateway"|"skill"|"action",
 *   description: string,
 *   inputSchema?: object,
 *   zodSchema?: import("zod/v4").ZodObject<any>,
 *   handler: (args: object) => Promise<{ isError?: boolean, content: Array<{ type: string, text: string }> }>
 * }} tool
 */
function registerTool(tool) {
  if (!ENTRIES.has(tool.entry)) {
    throw new Error(`registerTool(${tool.name}): entry must be one of ${[...ENTRIES].join(", ")}, got ${String(tool.entry)}`);
  }

  if (IS_MINIMAL_TOOLS && !MINIMAL_ALLOWLIST.has(tool.name)) {
    return;
  }

  const existing = _tools.findIndex((registered) => registered.name === tool.name);

  if (existing === -1) {
    _tools.push(tool);
  } else {
    _tools[existing] = tool;
  }

  _generation += 1;
}

/** Empty the tool list and invalidate the surface memo. */
function resetTools() {
  _tools.length = 0;
  _generation += 1;
}

export { registerTool, resetTools, retainTools, toolsGeneration, _tools };
