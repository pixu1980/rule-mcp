

/**
 * Filesystem and path helpers shared by every installer: resolve, read,
 * atomic-write, remove, backup, plus the home/constants the writers use.
 * @module cli/installers/paths
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const resolvePath = (relative) => resolve(fileURLToPath(new URL("../../../", import.meta.url)), relative);

const serverName = "rule-mcp";

const IS_WINDOWS = platform() === "win32";

const IS_MACOS = platform() === "darwin";

const IS_LINUX = platform() === "linux";

const HOME = homedir();

const COMMAND_TEMPLATE_PATH = fileURLToPath(new URL("../../../prompts/rule-mcp.md", import.meta.url));

const readText = (file) => (existsSync(file) ? readFileSync(file, "utf8") : "");

const atomicWrite = ({ file, content, dryRun }) => {
  if (content === null) {
    throw new Error(`Cannot write null content to ${file} - parse error in source`);
  }

  if (dryRun) {
    return file;
  }

  if (existsSync(file)) {
    backupFile(file);
  }

  const temporary = file + ".tmp." + Date.now();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(temporary, content, "utf8");
  try {
    rmSync(file, { force: true });
  } catch {
    /* ignore: file may not exist yet */
  }

  writeFileSync(file, content, "utf8");
  try {
    rmSync(temporary, { force: true });
  } catch {
    /* ignore: temp file may not exist yet */
  }

  return file;
};

const writeText = ({ file, content, dryRun, force = true, skipIfExists = false }) => {
  if (content === null) {
    throw new Error(`Cannot write null content to ${file} - parse error in source`);
  }
  // The forced-overwrite promise: without --force, a file the user (or a
  // previous install) wrote is left alone; with it, it is replaced.
  if (skipIfExists && existsSync(file) && !force) {
    return file;
  }

  if (!dryRun) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }

  return file;
};

const removeFile = (file) => {
  if (existsSync(file)) {
    rmSync(file, { force: true });
  }
};

const backupFile = (file) => {
  if (!existsSync(file)) {
    return null;
  }

  const backup = `${file}.bak`;
  try {
    const content = readFileSync(file);
    writeFileSync(backup, content);

    return backup;
  } catch {
    return null;
  }
};

const resolveGlobalBinary = () => {
  // Check common pnpm/Homebrew locations (fast path, no shell overhead).
  const HOME = homedir();
  const candidates = [join(HOME, "Library", "pnpm", "bin", "rule-mcp"), "/opt/homebrew/bin/rule-mcp", "/usr/local/bin/rule-mcp"];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  // Fall back to PATH scan, but exclude local node_modules/.bin (project-local shims).
  try {
    const out = execSync("command -v rule-mcp 2>/dev/null || which rule-mcp 2>/dev/null", {
      encoding: "utf8",
      timeout: 2000,
    }).trim();
    if (out && existsSync(out) && !out.includes("node_modules/.bin")) {
      return out;
    }
  } catch {
    // Not found - fall back to local Node entrypoint.
  }

  return null;
};

export { serverName, IS_WINDOWS, IS_MACOS, IS_LINUX, HOME, COMMAND_TEMPLATE_PATH, resolvePath, readText, atomicWrite, writeText, removeFile, backupFile, resolveGlobalBinary };
