/** Tool registry state and hook management (before/post/after), plus register/clear/retain. */

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

/** Mandatory before-tool hooks. Failures block execution. */
const _beforeHooks = {};

/** Mandatory post-tool hooks. Failures block result delivery. */
const _postHooks = {};

/** Observational after-tool hooks. Failures never alter tool results. */
const _afterHooks = {};

function countAfterHooks(toolName) {
  return (_afterHooks[toolName] ?? []).length;
}

/** Register mandatory preprocessing hook. */
function addBeforeToolHook(toolName, function_) {
  if (!_beforeHooks[toolName]) {
    _beforeHooks[toolName] = [];
  }

  _beforeHooks[toolName].push(function_);
}

/** Register mandatory postprocessing hook. */
function addPostToolHook(toolName, function_) {
  if (!_postHooks[toolName]) {
    _postHooks[toolName] = [];
  }

  _postHooks[toolName].push(function_);
}

/**
 * Register a hook that fires after a tool completes successfully.
 * Wildcard "*" hooks fire for every tool.
 *
 * @param {string} toolName - Tool name or "*" for all tools
 * @param {(toolName: string, args: object, result: object) => Promise<void>} fn
 */
function addAfterToolHook(toolName, fn) {
  if (!_afterHooks[toolName]) {
    _afterHooks[toolName] = [];
  }

  _afterHooks[toolName].push(fn);
}

/**
 * Clear all registered tools. Used during force-reload to
 * allow re-registration without duplicate entries.
 */
function clearTools() {
  _tools.length = 0;
  _generation += 1;

  for (const key of Object.keys(_afterHooks)) {
    delete _afterHooks[key];
  }
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
 * @param {{
 *   name: string,
 *   description: string,
 *   inputSchema?: object,
 *   zodSchema?: import("zod/v4").ZodObject<any>,
 *   handler: (args: object) => Promise<{ isError?: boolean, content: Array<{ type: string, text: string }> }>
 * }} tool
 */
function registerTool(tool) {
  _tools.push(tool);
  _generation += 1;
}

/** Tools that change something on disk or in the project. Everything else is a
 * read, so clients use readOnlyHint to skip a confirmation prompt. */

export {
  countAfterHooks,
  addBeforeToolHook,
  addPostToolHook,
  addAfterToolHook,
  clearTools,
  retainTools,
  registerTool,
  toolsGeneration,
  _tools,
  _beforeHooks,
  _postHooks,
  _afterHooks,
};
