

/**
 * @module cli/setup/scan
 *
 * What is actually installed on this machine.
 *
 * The uninstall wizard offers choices, not a fixed list, so it has to look
 * first. Every entry carries a count or a path: "3 agent configs" is a
 * question the user can answer, "removes configuration" is not.
 *
 * The catalog copies live in `_scan-skills.js`: they are the one group whose
 * probe needs the skill catalog, and the size cap does not care why.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { renderAgentCommandFiles } from "../../core/agents/commands/index.js";
import { resolveCommandTargets } from "../../core/agents/command-targets/index.js";
import { detectInstalledAgents } from "../install/index.js";
import { copiedSkillDirs } from "./_scan-skills.js";
import { legacyHookFiles } from "./_legacy-hooks.js";
import { removableTargets } from "./_rules-apply.js";
import { purgeTargets } from "./_runtime-home.js";
import { globalShimPresent } from "./_shim-apply.js";
import { hasOwnedLines, profilePaths } from "./_shell-profile.js";
import { daemonServicePresent } from "./_service-status.js";

/** Agents whose config currently names this server. */
export const configuredAgents = () => detectInstalledAgents().filter((agent) => agent.configured);

/** Shell startup files carrying lines this installer wrote. */
export const dirtyProfiles = (home = homedir()) => profilePaths(home).filter((file) => existsSync(file) && hasOwnedLines(readFileSync(file, "utf8")));

/**
 * The generated command files that are actually on disk, per directory.
 *
 * A count of directories is a claim; a count of files is a finding. The scan
 * reports the second, so a machine with no command file offers nothing to
 * remove.
 *
 * @returns {Array<{ dir: string, files: string[] }>}
 */
export function installedCommandFiles() {
  return resolveCommandTargets({ detectedOnly: true })
    .map(({ dir, format }) => ({
      dir,
      files: renderAgentCommandFiles(format)
        .map(({ filename }) => join(dir, filename))
        .filter((file) => existsSync(file)),
    }))
    .filter((entry) => entry.files.length > 0);
}

/**
 * The full inventory, as the removable groups the wizard renders.
 *
 * @returns {{ groups: Array<{ id: string, label: string, detail: string, count: number, items: string[] }>, agents: string[], purge: object[] }}
 */
export function scanInstallation() {
  const agents = configuredAgents();
  const rules = removableTargets();
  const profiles = dirtyProfiles();
  const purge = purgeTargets();
  const service = daemonServicePresent();
  const hooks = legacyHookFiles();
  const shim = globalShimPresent();
  const skills = copiedSkillDirs();
  const commands = installedCommandFiles();

  const groups = [
    {
      id: "agents",
      label: "Agent MCP configs",
      detail: "remove the rule-mcp entry",
      count: agents.length,
      items: agents.map((agent) => `${agent.name} - ${agent.configFile}`),
    },
    {
      id: "rules",
      label: "Instruction files",
      detail: "strip the managed rules block",
      count: rules.length,
      items: rules.map((target) => target.file),
    },
    {
      id: "commands",
      label: "Agent slash commands",
      detail: "remove the rule-* command files",
      count: commands.reduce((total, entry) => total + entry.files.length, 0),
      items: commands.map((entry) => `${entry.files.length} in ${entry.dir}`),
    },
    {
      id: "skills",
      label: "Bundled rule-* skills",
      detail: "delete the copied catalog directories",
      count: skills.reduce((total, entry) => total + entry.removed.length, 0),
      items: skills.map((entry) => `${entry.removed.length} in ${entry.dir}`),
    },
    {
      id: "git-hook",
      label: "Legacy git hook block",
      detail: "strip the block an older install left in the global hooks",
      count: hooks.length,
      items: hooks,
    },
    {
      id: "service",
      label: "Daemon service",
      detail: "LaunchAgent, systemd unit, or Windows service",
      count: service.present ? 1 : 0,
      items: service.present ? [service.detail] : [],
    },
    {
      id: "profiles",
      label: "Shell profiles",
      detail: "remove lines this installer wrote",
      count: profiles.length,
      items: profiles,
    },
    {
      id: "shim",
      label: "Global shim",
      detail: "launchers and pnpm global links",
      count: shim ? 1 : 0,
      items: shim ? ["rule-mcp on PATH"] : [],
    },
  ];

  return { groups, agents: agents.map((agent) => agent.name), purge };
}
