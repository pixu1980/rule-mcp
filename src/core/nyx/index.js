/**
 * Optional in-process Nyx decision engine.
 *
 * Nyx is a separate package (`nyx/mcp`). When it is absent, disabled or
 * failing, every caller keeps its deterministic behavior: this module only
 * ever answers with an adapter or null.
 */
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Where to load Nyx from.
 *
 * The default is the bare specifier `nyx/mcp`, which resolves when the
 * package is installed. A local checkout can be pointed at without touching
 * this manifest: `RULE_MCP_NYX_MODULE=/abs/path/to/nyx/src/adapters/mcp.mjs`.
 *
 * @returns {string}
 */
function nyxSpecifier() {
  const configured = process.env.RULE_MCP_NYX_MODULE;

  if (!configured) {
    return "nyx/mcp";
  }

  return isAbsolute(configured) ? pathToFileURL(configured).href : configured;
}

/**
 * Whether the Nyx integration is allowed to load.
 * `RULE_MCP_NO_NYX=1` disables it without uninstalling the package.
 *
 * @returns {boolean}
 */
export function nyxEnabled() {
  return process.env.RULE_MCP_NO_NYX !== "1";
}

/** @type {Promise<import("nyx/mcp").McpAdapter|null>|undefined} */
let adapterPromise;

/**
 * Load the Nyx adapter once per process. A missing package, a disabled flag or
 * a loader error all resolve to null, so the caller falls back to BM25.
 *
 * `RULE_MCP_NYX_CONFIG=/path/nyx.config.json` switches on a richer Nyx
 * (embeddings, remote engine) without touching this repository.
 *
 * @returns {Promise<import("nyx/mcp").McpAdapter|null>}
 */
export function loadNyxAdapter() {
  if (!nyxEnabled()) {
    return Promise.resolve(null);
  }

  adapterPromise ??= import(nyxSpecifier())
    .then((module) => {
      const configPath = process.env.RULE_MCP_NYX_CONFIG;

      return configPath ? module.createMcpAdapterFromConfigFile(configPath, { logger: null }) : module.createMcpAdapter({ logger: null });
    })
    .catch(() => null);

  return adapterPromise;
}
