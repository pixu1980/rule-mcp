/** @module cli/paths/runtime - the package, the port, the host, the state dirs */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** @type {{ name: string, version: string }} */
export const pkg = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));

/**
 * Canonical default port for the SSE/HTTP transport.
 * Single source of truth shared by the CLI, daemon, Docker image, and docs.
 * Override with --port or the RULE_MCP_PORT env var.
 */
export const DEFAULT_SSE_PORT = 37_999;

/**
 * Host/interface the SSE/HTTP transport binds to.
 * Defaults to loopback; set RULE_MCP_HOST=0.0.0.0 inside containers so the
 * mapped port is reachable from the host.
 *
 * @returns {string}
 */
export function getSseHost() {
  return process.env.RULE_MCP_HOST || "127.0.0.1";
}

/**
 * Get runtime paths for state files, data, config, and skills.
 *
 * Everything lives under one root the user can see: `~/.rule-mcp`.
 * `state/` holds the mutable caches (result cache, bm25, token, daemon pid/log),
 * `data/` the install-time artifacts, `config/` the user configuration.
 * `RULE_MCP_STATE_DIR` relocates just the mutable state for containers and
 * tests; `RULE_MCP_HOME` relocates the whole root.
 *
 * @returns {{
 *   homeDir: string,
 *   stateDir: string,
 *   dataDir: string,
 *   pidFile: string,
 *   logFile: string,
 *   configDir: string
 * }}
 */
export function getRuntimePaths() {
  const root = process.env.RULE_MCP_HOME || join(homedir(), ".rule-mcp");
  const stateDir = process.env.RULE_MCP_STATE_DIR || join(root, "state");
  const dataDir = join(root, "data");

  return {
    homeDir: root,
    stateDir,
    dataDir,
    pidFile: join(stateDir, "daemon.pid"),
    logFile: join(stateDir, "daemon.log"),
    configDir: join(root, "config"),
  };
}
