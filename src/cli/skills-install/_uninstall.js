

/** @module cli/skills-install/uninstall - remove the skills the installer copied */

import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { activeRoles, personaCommandName } from "../../core/review/roles/index.js";
import { getAvailableSkills } from "./_catalog.js";

/** The catalog skill names the installer copies. */
export function catalogSkillNames() {
  return getAvailableSkills().map((skill) => skill.name);
}

/** The generated persona skill names the installer writes beside the catalog. */
export function personaSkillNames() {
  return activeRoles().map((role) => personaCommandName(role.id));
}

/** Every directory name the installer owns in a skills target. */
export function installedSkillNames() {
  return [...catalogSkillNames(), ...personaSkillNames()];
}

/**
 * Whether a directory name belongs to the server. Every skill the installer
 * copies lives in the `rule-mcp-` namespace, so a `rule-mcp-` directory in one of the
 * install targets is the installer's, including a name an earlier release wrote
 * and a later one renamed away (`rule-mcp-process-compression`, persona
 * `rule-mcp-persona-<role>-<operation>`).
 *
 * @param {string} name
 * @returns {boolean}
 */
export function isInstallerOwned(name) {
  return name === "rule-mcp" || (typeof name === "string" && name.startsWith("rule-mcp-"));
}

/**
 * Remove the copied skills from one target directory.
 *
 * Only the installer's namespace is removed; a skill the user wrote by hand
 * (`caveman`, `compress`) is not `rule-mcp-`, so it survives. A missing directory is
 * a no-op.
 *
 * @param {string} targetDir
 * @param {{ dryRun?: boolean }} [options]
 * @returns {string[]} the names removed, or that would be, sorted
 */
export function removeInstalledSkills(targetDir, { dryRun = false } = {}) {
  if (!existsSync(targetDir)) {
    return [];
  }

  const removed = [];

  for (const entry of readdirSync(targetDir)) {
    const path = join(targetDir, entry);

    if (!isInstallerOwned(entry) || !statSync(path).isDirectory()) {
      continue;
    }

    if (!dryRun) {
      rmSync(path, { recursive: true, force: true });
    }

    removed.push(entry);
  }

  return removed.sort();
}

/**
 * The global directories an install could have written skills into: the central
 * `~/.agents/skills`, the native `~/.claude/skills`, and `~/.claude` itself,
 * which an older native step wrote catalog directories straight into.
 *
 * @param {string} [home]
 * @returns {string[]}
 */
export function globalSkillsDirs(home = homedir()) {
  return [join(home, ".agents", "skills"), join(home, ".claude", "skills"), join(home, ".claude")];
}

/**
 * Remove the copied skills from every given directory.
 *
 * @param {string[]} dirs
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Array<{ dir: string, removed: string[] }>} only the directories that held something
 */
export function removeInstalledSkillsFrom(dirs, { dryRun = false } = {}) {
  return dirs.map((dir) => ({ dir, removed: removeInstalledSkills(dir, { dryRun }) })).filter((entry) => entry.removed.length > 0);
}

/**
 * Remove the skills the installer copied, from every global directory an install
 * could have written into (or the project's own `.agents/skills`).
 *
 * This is what makes the install's "Bundled rule-mcp-* skills" choice two-way: a run
 * that does not select the step reconciles the copied directories away instead
 * of leaving them for the host to discover (`/skill:rule-mcp-*` in pi and Claude).
 *
 * @param {{ scope?: string, dryRun?: boolean }} [options]
 * @returns {Array<{ dir: string, removed: string[] }>}
 */
export function skillsUninstallCommand(options = {}) {
  const scope = options.scope || "global";
  const dryRun = options.dryRun || false;
  const dirs = scope === "project" ? [".agents/skills"] : globalSkillsDirs();
  const results = removeInstalledSkillsFrom(dirs, { dryRun });
  const total = results.reduce((sum, entry) => sum + entry.removed.length, 0);

  if (total === 0) {
    process.stdout.write("No copied skills found. Nothing removed.\n");

    return results;
  }

  for (const { dir, removed } of results) {
    process.stdout.write(`  ${dryRun ? "[dry-run] " : ""}${removed.length} skill(s) ${dryRun ? "would be removed" : "removed"} from ${dir}\n`);
  }

  process.stdout.write(`${dryRun ? "Would remove" : "Removed"} ${total} skill(s).\n`);

  return results;
}
