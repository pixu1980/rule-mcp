/** Hook registry (before/post/after) plus the tool registry's public surface. */
import { resetTools } from "./_registry.js";

export { registerTool, retainTools, toolsGeneration, _tools } from "./_registry.js";

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
  resetTools();

  for (const key of Object.keys(_afterHooks)) {
    delete _afterHooks[key];
  }
}

export { countAfterHooks, addBeforeToolHook, addPostToolHook, addAfterToolHook, clearTools, _beforeHooks, _postHooks, _afterHooks };
