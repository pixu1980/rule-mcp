/**
 * @module tools/router/contract
 *
 * The tool surface as a contract: the version a client may pin, and the renames
 * that keep answering for one release.
 *
 * A tool name is a public API - a client caches it, a slash command spells it,
 * a config file stores it - so a rename is a breaking change nobody hears about
 * until their prompt stops resolving. This module is the one place a rename is
 * declared and the one place its alias is read, so the surface can change
 * without a client discovering it at failure time.
 */

/** The tool surface's version. Bumped whenever a tool is renamed or removed. */
export const TOOL_CONTRACT_VERSION = "1.1.0";

/**
 * Renames the surface still answers to.
 *
 * Each entry keeps the name it had working until `removeAfter`: the registry
 * resolves it to the tool that answers now, and the first use of an alias warns
 * once on stderr, so a client meets the deprecation before the release that
 * removes it.
 *
 * @type {Array<{ from: string, to: string, removeAfter: string }>}
 */
export const DEPRECATIONS = [{ from: "rule_tool_plan_docs", to: "rule_tool_impersonation", removeAfter: "0.3.0" }];

/** Aliases already warned about, so a client that calls in a loop is told once. */
const warned = new Set();

/**
 * The name that answers for `name` today, and the alias it came from.
 *
 * @param {string} name
 * @param {Array<{ from: string, to: string, removeAfter: string }>} [map] - the shipped map by default
 * @returns {{ name: string, alias?: string }}
 */
export function resolveToolName(name, map = DEPRECATIONS) {
  const entry = map.find((candidate) => candidate.from === name);

  if (!entry) {
    return { name };
  }

  if (!warned.has(name)) {
    warned.add(name);
    process.stderr.write(`[rule-mcp] tool ${name} is deprecated, use ${entry.to} (removed after ${entry.removeAfter})\n`);
  }

  return { name: entry.to, alias: name };
}
