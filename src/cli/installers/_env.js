/**
 * RULE_MCP_* environment configuration: where it lives on disk, the opt-out
 * defaults, and the mcpServerConfig builders that merge env + CLI args.
 * @module cli/installers/env
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolveGlobalBinary, serverName } from "./_paths.js";
import { normalizeInstallMode } from "./_catalog.js";
import { getOrCreateSseBearerToken } from "../../transport/index.js";
import { DEFAULT_SSE_PORT } from "../paths/index.js";

const ENV_CONFIG_DIR = join(homedir(), ".config", "rule-mcp");

const ENV_CONFIG_FILE = join(ENV_CONFIG_DIR, "env.json");

/**
 * The compiled code cache directory handed to every agent spawn.
 *
 * stdio starts the server as a subprocess per client, so module compilation is
 * paid per connect. A per-user directory keeps the cache out of the install
 * tree (which may be read-only, or shared between users).
 */
const COMPILE_CACHE_DIR = join(homedir(), ".cache", "rule-mcp", "compile-cache");

const DEFAULT_OPTOUT_ENV = {
  RULE_MCP_NO_AUTOUPDATE: "0",
  RULE_MCP_NO_AUTORESTART: "0",
  RULE_MCP_NO_CACHE: "0",
  RULE_MCP_NO_COMPRESSION: "0",
  RULE_MCP_NO_TOKENSAVE: "0",
  RULE_MCP_NO_REMINDER: "0",
  RULE_MCP_NO_FLIGHT: "0",
  RULE_MCP_NO_PROMPTS: "1",
};

/** Env var that selects the minimal MCP tool surface (see core/skills/_minimal.js). */
export const MINIMAL_ENV_VAR = "RULE_MCP_MINIMAL_TOOLS";

/**
 * The minimal choice an environment carries, or nothing when it carries none.
 *
 * Pure so the installer can be tested without a home directory: the saved
 * file stays the job of `resolveEnvironment`, this only reads the ambient.
 *
 * @param {object} [env]
 */
export function minimalEnvFrom(env = process.env) {
  const value = env[MINIMAL_ENV_VAR];

  return value === undefined ? {} : { [MINIMAL_ENV_VAR]: value };
}

function readEnvConfig() {
  try {
    if (!existsSync(ENV_CONFIG_FILE)) {
      return {};
    }

    return JSON.parse(readFileSync(ENV_CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeEnvConfig(environment) {
  mkdirSync(ENV_CONFIG_DIR, { recursive: true });
  writeFileSync(ENV_CONFIG_FILE, JSON.stringify(environment, null, 2) + "\n", "utf8");
}

function resolveEnvironment(options = {}) {
  const saved = readEnvConfig();
  // Opt-out defaults are the base so they always appear in generated config;
  // saved preferences and explicit opts override them.
  // The cache directory is not an opt-out flag, so it sits beside the table
  // rather than in it: every entry there is a documented "0" the user flips.
  // An ambient minimal choice rides along between saved and explicit: the
  // running server already honors it (see core/skills/_minimal.js), so the
  // written config says what the runtime does instead of hiding it.
  return { NODE_COMPILE_CACHE: COMPILE_CACHE_DIR, ...DEFAULT_OPTOUT_ENV, ...saved, ...minimalEnvFrom(), ...options.env };
}

const commandConfig = (entrypoint, options = {}) => {
  const mode = normalizeInstallMode(options.mode);
  const environment = resolveEnvironment(options);
  // Only pi.dev coding agent supports directTools + lifecycle
  const isPi = options.agentName === "pi";

  if (mode === "daemon" || mode === "docker") {
    const port = Number.isInteger(options.port) && options.port > 0 && options.port < 65_536 ? options.port : DEFAULT_SSE_PORT;
    const token = getOrCreateSseBearerToken();
    const config = {
      url: `http://127.0.0.1:${port}/sse`,
      headers: { Authorization: `Bearer ${token}` },
    };
    if (isPi) {
      config.directTools = true;
      config.lifecycle = "keep-alive";
      // Bare per-server tool naming: tools become `rule-mcp-tool-*` and prompts
      // `/rule-mcp-*` instead of the `mcp__rule_mcp__*` prefix form.
      config.toolPrefix = "none";
    }

    return config;
  }

  // Build stdio config
  let config;
  const globalBin = resolveGlobalBinary();

  if (globalBin) {
    const home = homedir();
    config = { command: globalBin, args: ["serve"], type: "stdio" };
  } else {
    config = { command: process.execPath, args: [entrypoint, "serve"] };
  }

  if (isPi) {
    config.directTools = true;
    config.lifecycle = "keep-alive";
    // Same clean naming as the daemon branch: bare `rule-mcp-tool-*` tools and
    // `/rule-mcp-*` prompts instead of `mcp__rule_mcp__*`.
    config.toolPrefix = "none";
  }

  // Attach env vars if any (supported by MCP stdio transport)
  if (Object.keys(environment).length > 0) {
    config.env = environment;
  }

  return config;
};

function mcpServerConfig(entrypoint, opts = {}) {
  return { [serverName]: commandConfig(entrypoint, opts) };
}

export { ENV_CONFIG_DIR, ENV_CONFIG_FILE, DEFAULT_OPTOUT_ENV, readEnvConfig, writeEnvConfig, resolveEnvironment, commandConfig, mcpServerConfig };
