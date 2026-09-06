/**
 * @module cli/paths
 *
 * Runtime path resolution for rule-mcp.
 * Provides paths for state, data, config, and skill directories.
 * All paths derive from a single home directory: `~/.rule-mcp`, one
 * visible root with `state/`, `data/`, `projects/`, `config/` underneath.
 */

import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
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

/**
 * Walk up looking for a repository root. Falls back to the starting directory,
 * which is the right answer for a project that is not under version control.
 *
 * @param {string} from
 * @returns {string}
 */
export function findProjectRoot(from) {
  let current = resolve(from);

  for (;;) {
    try {
      if (existsSync(join(current, ".git"))) {
        return current;
      }
    } catch {
      /* an unreadable directory is not a root */
    }

    const parent = dirname(current);

    if (parent === current) {
      return resolve(from);
    }

    current = parent;
  }
}

/**
 * The directory name a project's recording is filed under.
 *
 * Half of it is the project's own name, so a person looking at the projects
 * root can tell what they are looking at, and half is a digest of the absolute
 * path, so two checkouts of the same repository are two recordings. Moving a
 * checkout starts a new one, which is the honest answer: the recording
 * describes a directory, and that directory is gone.
 *
 * @param {string} projectDir - absolute path to the project root
 * @returns {string}
 */
export function projectSlug(projectDir) {
  const name =
    basename(projectDir)
      .toLowerCase()
      .replaceAll(/[^a-z0-9-]+/g, "-")
      .replaceAll(/^-+|-+$/g, "") || "project";
  const digest = createHash("sha256").update(projectDir).digest("hex").slice(0, 8);

  return `${name}-${digest}`;
}

/**
 * Where this server keeps what it learned about ONE project.
 *
 * Telemetry, the exported flights and the project id are facts about a
 * repository, not about a machine: a cache hit rate averaged over every project
 * on the disk answers nothing, and a benchmark export belongs next to the code
 * it benchmarked. The daemon's pid, its log and the result cache stay in the
 * state directory, because a single daemon serves every project at once.
 *
 * The root is the repository root when there is one, so a call made from a
 * subdirectory records into the same place as one made from the top.
 *
 * @param {string} [cwd]
 * @returns {{ projectDir: string, dir: string, exportsDir: string }}
 */
export function getProjectPaths(cwd = process.cwd()) {
  const projectDir = findProjectRoot(cwd);
  const dir = join(projectsRoot(), projectSlug(projectDir));

  return { projectDir, dir, exportsDir: join(dir, "exports") };
}

/**
 * Where every project's recording is kept.
 *
 * RULE_MCP_STATE_DIR relocates mutable state, and a recording is mutable
 * state: honoring it here is what keeps a test suite, or a container, out of the
 * real home directory. Without that, a suite that pointed the state directory at
 * a temporary path still wrote its project into the home.
 *
 * @returns {string}
 */
function projectsRoot() {
  return join(getRuntimePaths().homeDir, "projects");
}

/**
 * Get skill directory paths.
 * Home skills override embedded skills for user-customizable rules.
 *
 * @returns {{
 *   homeSkills: string,       - ~/.agents/skills (user's custom skills)
 *   embeddedSkills: string     - Bundled skills directory relative to this source file
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
