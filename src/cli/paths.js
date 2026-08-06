/**
 * @module cli/paths
 *
 * Runtime path resolution for rule-mcp.
 * Provides paths for state, data, config, and skill directories.
 * All paths are derived from the user's home directory and OS conventions.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {{ name: string, version: string }} */
export const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));

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
 * @returns {{
 *   stateDir: string,
 *   dataDir: string,
 *   pidFile: string,
 *   logFile: string,
 *   configDir: string
 * }}
 */
export function getRuntimePaths() {
  // RULE_MCP_STATE_DIR lets containers and tests relocate mutable state
  // (tokens, caches, daemon pid) off the default ~/.local/state path.
  const stateDir = process.env.RULE_MCP_STATE_DIR || join(homedir(), ".local", "state", "rule-mcp");
  const dataDir = join(homedir(), ".local", "share", "rule-mcp");

  return {
    stateDir,
    dataDir,
    pidFile: join(stateDir, "daemon.pid"),
    logFile: join(stateDir, "daemon.log"),
    configDir: join(homedir(), ".config", "rule-mcp"),
  };
}

/**
 * Get skill directory paths.
 * Home skills override embedded skills for user-customizable rules.
 *
 * @returns {{
 *   homeSkills: string,       — ~/.agents/skills (user's custom skills)
 *   embeddedSkills: string     — Bundled skills directory relative to this source file
 * }}
 */
export function getSkillsDirs() {
  const homeSkills = join(homedir(), ".agents", "skills");
  // fileURLToPath handles Windows drive letters and percent-encoding correctly;
  // URL.pathname would yield a leading "/" and keep "%20" on non-POSIX platforms.
  const embeddedSkills = fileURLToPath(new URL("../../skills", import.meta.url));
  return { homeSkills, embeddedSkills };
}

/**
 * Absolute path of the package/repo root (two levels up from src/cli/).
 *
 * @returns {string}
 */
export function getRepoRoot() {
  // RULE_MCP_REPO_ROOT overrides for non-standard installs and tests.
  return process.env.RULE_MCP_REPO_ROOT || fileURLToPath(new URL("../../", import.meta.url));
}

/**
 * Detect how this server was installed, which determines whether it can
 * self-update via git.
 *
 * @returns {"git"|"npm"|"docker"|"unknown"}
 */
export function detectInstallType() {
  const root = getRepoRoot();
  try {
    // A git clone can pull; this is the only self-updatable install.
    if (existsSync(join(root, ".git"))) {
      return "git";
    }
  } catch {
    /* ignore */
  }
  if (existsSync("/.dockerenv") || process.env.RULE_MCP_DOCKER === "1") {
    return "docker";
  }
  if (root.includes(`${sep}node_modules${sep}`) || root.endsWith(`${sep}node_modules`)) {
    return "npm";
  }
  return "unknown";
}
