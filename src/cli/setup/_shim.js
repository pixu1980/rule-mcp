

/**
 * @module cli/setup/shim
 *
 * Finding the global `rule-mcp` launcher and deciding whether to trust it.
 *
 * A shim pins the absolute path of the repo it was created from. Move the
 * project and the shim stays on PATH but crashes on launch, and every agent
 * install after it fails silently (ADR 046). Nothing here trusts the shim's
 * existence: it is verified by running it.
 */

import { existsSync, readdirSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

import { tryExec } from "../../shared/index.js";

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

/** Whether the shim on PATH actually launches. */
export function shimWorks() {
  if (!shimPath()) {
    return false;
  }

  return tryExec("rule-mcp --version").trim() !== "";
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

  return platform() === "darwin"
    ? join(homedir(), "Library", "pnpm", "bin")
    : join(homedir(), ".local", "share", "pnpm", "bin");
}

/**
 * Every path a shim may have been written to, for removal.
 *
 * The `-mcpd` alias is retired (ADR 064) and is swept alongside the current
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

  return roots
    .filter((root) => existsSync(root))
    .flatMap((root) => readdirSync(root).map((version) => join(root, version, "node_modules", "rule-mcp")));
}
