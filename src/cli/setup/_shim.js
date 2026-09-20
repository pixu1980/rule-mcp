

/**
 * @module cli/setup/shim
 *
 * Finding the global `rule-mcp` launcher and deciding whether to trust it.
 *
 * A shim pins the absolute path of the repo it was created from. Move the
 * project and the shim stays on PATH but crashes on launch, and every agent
 * install after it fails silently (ADR 045). Nothing here trusts the shim's
 * existence or its name: the shim is resolved to this checkout's entrypoint
 * before it is run.
 */

import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

import { tryExec, tryExecFile } from "../../shared/index.js";
import { getRepoRoot } from "../paths/index.js";

/** Set to "1" by tests and sandboxes to keep the machine's real shim untouched. */
export const skipGlobalLink = () => process.env.RULE_MCP_SKIP_GLOBAL_LINK === "1";

const IS_WINDOWS = platform() === "win32";

/** Absolute path of the shim on PATH, or "" when there is none. */
export function shimPath() {
  const lookup = IS_WINDOWS ? "where rule-mcp" : "command -v rule-mcp";

  return tryExec(lookup, { shell: IS_WINDOWS ? undefined : "/bin/sh" })
    .split("\n", 1)[0]
    .trim();
}

/** This checkout's own entrypoint: the only target a shim is trusted to name. */
export function ownEntrypoint() {
  return join(getRepoRoot(), "bin", "rule-mcp.js");
}

/** A path with its symlinks resolved, or the path itself when it does not exist. */
function resolved(path) {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/**
 * What a shim launches, or "" when it names something other than this
 * checkout's entrypoint.
 *
 * A shim is trusted when it resolves to the entrypoint: a symlink whose real
 * path is the entrypoint, or a launcher whose text names it. Any other program
 * wearing the name is what a poisoned PATH looks like, and running it is the
 * vulnerability this check exists to close.
 *
 * @param {string} shim
 * @param {string} [entrypoint]
 * @returns {string}
 */
export function shimTarget(shim, entrypoint = ownEntrypoint()) {
  const own = resolved(entrypoint);

  if (resolved(shim) === own) {
    return own;
  }

  try {
    return readFileSync(shim, "utf8").includes(entrypoint) ? own : "";
  } catch {
    return "";
  }
}

/**
 * Whether the shim on PATH launches this checkout.
 *
 * `rule-mcp --version` executes whatever PATH yields, and a name is not
 * a proof of origin, so the shim is resolved first and run second.
 *
 * @param {{ path?: string, entrypoint?: string, run?: Function }} [options]
 * @returns {boolean}
 */
export function shimWorks({ path = shimPath(), entrypoint, run = tryExecFile } = {}) {
  if (!path || !shimTarget(path, entrypoint ?? ownEntrypoint())) {
    return false;
  }

  // A .cmd shim is not executable without a shell; cmd /c receives the shim as
  // its own argument, so nothing is interpolated into a command string.
  const [file, args] = IS_WINDOWS ? ["cmd", ["/c", path, "--version"]] : [path, ["--version"]];

  return run(file, args).trim() !== "";
}

/**
 * The directory a new shim should be written to: `$PNPM_HOME/bin` when set,
 * else whatever pnpm reports, else the platform default.
 */
export function globalBinDir() {
  if (process.env.PNPM_HOME) {
    return join(process.env.PNPM_HOME, "bin");
  }

  const configured = tryExec("pnpm config get global-bin-dir").trim();

  if (configured && configured !== "undefined") {
    return configured;
  }

  return platform() === "darwin" ? join(homedir(), "Library", "pnpm", "bin") : join(homedir(), ".local", "share", "pnpm", "bin");
}

/**
 * Every path a shim may have been written to, for removal.
 *
 * The `-mcpd` alias is retired (ADR 061) and is swept alongside the current
 * name: a stale shim keeps `command -v` resolving forever and silently
 * breaks the next install.
 */
export function shimCandidates(home = homedir()) {
  const dirs = [
    process.env.PNPM_HOME && join(process.env.PNPM_HOME, "bin"),
    join(home, "Library", "pnpm", "bin"),
    join(home, ".local", "share", "pnpm", "bin"),
    join(home, ".pnpm-global", "bin"),
    join(home, ".npm-global", "bin"),
  ].filter(Boolean);

  return [...new Set(dirs.flatMap((dir) => ["rule-mcp", "rule-mcpd"].map((name) => join(dir, name))))];
}

/** Linked package entries inside pnpm's per-user global store. */
export function linkCandidates(home = homedir()) {
  const roots = [join(home, "Library", "pnpm", "global"), join(home, ".local", "share", "pnpm", "global")];

  return roots.filter((root) => existsSync(root)).flatMap((root) => readdirSync(root).map((version) => join(root, version, "node_modules", "rule-mcp")));
}
