/**
 * @module cli/setup/scan
 *
 * What is actually installed on this machine.
 *
 * The uninstall wizard offers choices, not a fixed list, so it has to look
 * first. Every entry carries a count or a path: "3 agent configs" is a
 * question the user can answer, "removes configuration" is not.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

import { detectInstalledAgents } from "../install/index.js";
import { postCommitPath } from "./_git-hook-apply.js";
import { hasHook } from "./_git-hook.js";
import { removableTargets } from "./_rules-apply.js";
import { purgeTargets } from "./_runtime-home.js";
import { globalShimPresent } from "./_shim-apply.js";
import { hasOwnedLines, profilePaths } from "./_shell-profile.js";
import { daemonServicePresent } from "./_service-status.js";

/** Agents whose config currently names this server. */
export const configuredAgents = () => detectInstalledAgents().filter((agent) => agent.configured);

/** Shell startup files carrying lines this installer wrote. */
export const dirtyProfiles = (home = homedir()) => profilePaths(home).filter((file) => existsSync(file) && hasOwnedLines(readFileSync(file, "utf8")));

/** Whether the post-commit hook carries the managed block. */
export function gitHookPresent(cwd = process.cwd()) {
  const file = postCommitPath(cwd);

  return Boolean(file) && existsSync(file) && hasHook(readFileSync(file, "utf8"));
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
  const hook = gitHookPresent();
  const shim = globalShimPresent();

  const groups = [
    {
      id: "agents",
      label: "Agent MCP configs",
      detail: "remove the rule-mcp entry",
      count: agents.length,
      items: agents.map((agent) => `${agent.name} - ${agent.configFile}`),
    },
    { id: "rules", label: "Instruction files", detail: "strip the managed rules block", count: rules.length, items: rules.map((target) => target.file) },
    { id: "commands", label: "Agent slash commands", detail: "remove the rule-* command files", count: 1, items: ["every detected agent command directory"] },
    { id: "git-hook", label: "Git post-commit hook", detail: "remove the managed block", count: hook ? 1 : 0, items: hook ? [postCommitPath()] : [] },
    {
      id: "service",
      label: "Daemon service",
      detail: "LaunchAgent, systemd unit, or Windows service",
      count: service.present ? 1 : 0,
      items: service.present ? [service.detail] : [],
    },
    { id: "profiles", label: "Shell profiles", detail: "remove lines this installer wrote", count: profiles.length, items: profiles },
    { id: "shim", label: "Global shim", detail: "launchers and pnpm global links", count: shim ? 1 : 0, items: shim ? ["rule-mcp on PATH"] : [] },
  ];

  return { groups, agents: agents.map((agent) => agent.name), purge };
}
