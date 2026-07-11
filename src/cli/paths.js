/**
 * @module cli/paths
 *
 * Runtime path resolution for pix-galaxy-mcp.
 * Provides paths for state, data, config, and skill directories.
 * All paths are derived from the user's home directory and OS conventions.
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {{ name: string, version: string }} */
export const pkg = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
);

/**
 * Get runtime paths for state files, data, config, and skills.
 *
 * @returns {{
 *   stateDir: string,
 *   dataDir: string,
 *   pidFile: string,
 *   logFile: string,
 *   port: number,
 *   configDir: string
 * }}
 */
export function getRuntimePaths() {
  const stateDir = join(homedir(), ".local", "state", "pix-galaxy-mcp");
  const dataDir = join(homedir(), ".local", "share", "pix-galaxy-mcp");

  return {
    stateDir,
    dataDir,
    pidFile: join(stateDir, "daemon.pid"),
    logFile: join(stateDir, "daemon.log"),
    port: 37999,
    configDir: join(homedir(), ".config", "pix-galaxy-mcp"),
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
  const embeddedSkills = new URL("../../skills", import.meta.url).pathname;
  return { homeSkills, embeddedSkills };
}
