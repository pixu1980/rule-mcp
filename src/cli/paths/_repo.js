/** @module cli/paths/repo - the shipped skills, the repo root and the install type */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";

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
  const embeddedSkills = fileURLToPath(new URL("../../../skills", import.meta.url));

  return { homeSkills, embeddedSkills };
}

/**
 * Absolute path of the package/repo root (two levels up from src/cli/).
 *
 * @returns {string}
 */
export function getRepoRoot() {
  // RULE_MCP_REPO_ROOT overrides for non-standard installs and tests.
  return process.env.RULE_MCP_REPO_ROOT || fileURLToPath(new URL("../../../", import.meta.url));
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
