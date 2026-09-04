/**
 * @module cli/paths
 *
 * Runtime path resolution for rule-mcp.
 * Provides paths for state, data, config, and skill directories.
 * All paths are derived from the user's home directory and OS conventions.
 */

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { uninstallGitHooks } from "../core/git-hooks.js";

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
  return join(getRuntimePaths().stateDir, "projects");
}

/**
 * The directories a previous install may have written INTO a project.
 *
 * The port migrates both the upstream recorder name and this server's own
 * earlier local layout, so a machine that ran either one converges.
 */
const LEGACY_PROJECT_DIRS = [".rule-mcp", ".rule-mcp"];

/**
 * Move a project's recording out of the project and into the state directory.
 *
 * An install from an earlier version has a local recorder directory in every
 * repository it observed, kept out of version control by a rule the git hooks
 * re-asserted. Neither exists now. The data does: a log that took months to
 * accumulate is not something a refactor gets to discard, so it is moved once,
 * appended if a central log already exists, and the rule that was written for
 * it is taken out of the `.gitignore` on the way past.
 *
 * Runs at most once per project per process. Every failure is swallowed: a
 * migration that cannot happen must degrade to recording in the new place, not
 * to a crash.
 *
 * @param {{ projectDir?: string }} [options]
 * @returns {{ migrated: boolean, from?: string, to?: string }}
 */
export function migrateProjectData(options = {}) {
  const projectDir = findProjectRoot(options.projectDir ?? process.cwd());

  if (_migratedProjects.has(projectDir)) {
    return { migrated: false };
  }

  _migratedProjects.add(projectDir);
  const from = LEGACY_PROJECT_DIRS.map((name) => join(projectDir, name)).find((path) => existsSync(path));

  if (!from) {
    return { migrated: false };
  }

  const { dir: to } = getProjectPaths(projectDir);

  try {
    mkdirSync(to, { recursive: true });

    for (const entry of readdirSync(from, { withFileTypes: true })) {
      const source = join(from, entry.name);
      const target = join(to, entry.name);

      if (entry.name === "telemetry.jsonl" && existsSync(target)) {
        // Two recordings of the same project: keep both, oldest first.
        appendFileSync(target, readFileSync(source, "utf8"));
        continue;
      }

      if (existsSync(target) && entry.isDirectory()) {
        for (const nested of readdirSync(source)) {
          if (!existsSync(join(target, nested))) {
            renameSync(join(source, nested), join(target, nested));
          }
        }

        continue;
      }

      if (!existsSync(target)) {
        renameSync(source, target);
      }
    }

    rmSync(from, { recursive: true, force: true });
    dropProjectIgnoreRule(projectDir);
    // The hooks existed only to keep that directory ignored, so they go with it.
    uninstallGitHooks();

    return { migrated: true, from, to };
  } catch {
    return { migrated: false };
  }
}

/** Take the recorder's line out of a `.gitignore` the server wrote it into. */
function dropProjectIgnoreRule(projectDir) {
  const file = join(projectDir, ".gitignore");

  try {
    if (!existsSync(file)) {
      return;
    }

    const kept = readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => !/^\.?(?:rule-mcp|rule-mcp)\/?$/.test(line.trim()));
    writeFileSync(file, kept.join("\n"));
  } catch {
    /* a read-only checkout keeps a rule for a directory that no longer exists */
  }
}

/** Projects whose local recording this process has already moved. */
const _migratedProjects = new Set();

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
