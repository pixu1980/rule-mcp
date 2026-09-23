

/**
 * @module cli/setup/scan-skills
 *
 * Where an install could have copied the catalog, and what is still there.
 *
 * Three directories, because three steps over time wrote to them: the central
 * `~/.agents/skills`, the native `~/.claude/skills`, and `~/.claude` itself,
 * which an older native step wrote catalog directories straight into. An
 * uninstall that swept only the current one left the other two behind.
 */

import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { isInstallerOwned } from "../skills-install/index.js";
import { getSkillsDirs as getSkillsDirectories } from "../paths/index.js";

/** Where Claude Code reads user skills from (mirrors skills-install/_native.js). */
const nativeSkillsDir = (home = homedir()) => join(home, ".claude", "skills");

/** Directory an older native step wrote catalog dirs straight into; still swept. */
const legacyNativeDir = (home = homedir()) => join(home, ".claude");

/** Catalog skills present at a target dir (mirrors old skills-install/_installed.js). */
const installedSkills = (targetDir) => {
  if (!existsSync(targetDir)) {
    return [];
  }

  return readdirSync(targetDir).filter((entry) => isInstallerOwned(entry) && existsSync(join(targetDir, entry, "SKILL.md")));
};

/**
 * Copied catalog directories, per directory an install could have written to.
 *
 * @returns {Array<{ dir: string, removed: string[] }>}
 */
export function copiedSkillDirs() {
  const { homeSkills } = getSkillsDirectories();

  return [homeSkills, nativeSkillsDir(), legacyNativeDir()].map((dir) => ({ dir, removed: installedSkills(dir) })).filter((entry) => entry.removed.length > 0);
}
