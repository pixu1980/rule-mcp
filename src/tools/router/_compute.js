/** Core computation with cache write-through: shared computeCore and the public recomputeCore. */

import { _beforeHooks, _postHooks, _tools } from "./_hooks.js";
import { estimateTokens } from "./_helpers.js";
import { getSkillNames, readSkill } from "./_skills.js";
import { postprocessToolResult, preprocessToolCall } from "../../core/enforcement/index.js";
import { routedSkillOf } from "./_entry.js";

function estimateRoutingSaving(name, core, final) {
  if (name !== "pix_tool") {
    return;
  }

  const route = routedSkillOf(name, core);

  if (!route) {
    return;
  }

  const full = readSkill(route);

  if (!full) {
    return;
  }

  return Math.max(0, Math.ceil(full.length / 4) - estimateTokens(final));
}

/**
 * Run a tool and return its deterministic core, the value the cache stores.
 *
 * Everything after this point is decoration that depends on when and where the
 * call happened: the reminder's once-then-terse state, compression, fingerprint
 * removal, an update banner. The core is what two runs of the same call must
 * agree on, which is why `cache verify` compares this and not the final result.
 *
 * @param {string} name
 * @param {object} tool - The registered tool.
 * @param {object} validated - Arguments after schema validation.
 * @returns {Promise<{ arguments: object, core: object }>}
 */
async function computeCore(name, tool, validated) {
  let processedArguments = preprocessToolCall(name, validated);
  const beforeHooks = [...(_beforeHooks["*"] || []), ...(_beforeHooks[name] || [])];

  for (const function_ of beforeHooks) {
    processedArguments = (await function_(name, processedArguments, tool)) ?? processedArguments;
  }

  let result = await tool.handler(processedArguments);

  const postHooks = [...(_postHooks["*"] || []), ...(_postHooks[name] || [])];

  for (const function_ of postHooks) {
    result = (await function_(name, processedArguments, result, tool)) ?? result;
  }

  return {
    arguments: processedArguments,
    core: postprocessToolResult(name, processedArguments, result, {
      toolNames: _tools.map((item) => item.name),
      skillNames: getSkillNames(),
    }),
  };
}

/**
 * Recompute a call without consulting or writing the cache.
 *
 * `cache verify` and `cache export` exist to check that a stored answer still
 * reproduces, so a recompute served from the cache would confirm only that the
 * cache agrees with itself.
 *
 * @param {string} name
 * @param {object} args
 * @returns {Promise<object>} the deterministic core
 */
async function recomputeCore(name, args) {
  const tool = _tools.find((item) => item.name === name);

  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  const validated = tool.zodSchema ? tool.zodSchema.parse(args) : args;

  return (await computeCore(name, tool, validated)).core;
}

/** Internal list of registered tool definitions. */

export { computeCore, recomputeCore, estimateRoutingSaving };
