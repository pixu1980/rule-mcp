

/**
 * @module cli/setup/task-extras
 *
 * The optional tasks: instruction files, slash commands, bundled skills, the
 * platform service, Docker, and the closing health check.
 *
 * Steps that print (skills, agent-commands, doctor) run out of process so
 * their stdout never lands in the middle of the wizard's frame.
 */

import { installDaemonService } from "../daemon/index.js";
import { selectionArgs } from "../install/_selection-flags.js";
import { selectionLabel } from "./_commands-items.js";
import { dockerComposeUp } from "./_docker.js";
import { runCliCommand } from "./_exec.js";
import { applyRules } from "./_rules-apply.js";
import { statusText } from "./_task-core.js";

/**
 * The argv for one `agent-commands --sync` run.
 *
 * Pure, and exported, because the agent list is the whole point: a step that
 * forgets it writes command files into hosts nobody selected. The selection is
 * the other half of that: without it the run writes every command there is,
 * which is the choice the commands step exists to take away.
 *
 * @param {{ agents?: string[], dryRun?: boolean, force?: boolean, remove?: boolean, selection?: object|null }} [options]
 * @returns {string[]}
 */
export const commandSyncArgs = ({ agents = [], dryRun = false, force = false, remove = false, selection = null } = {}) => [
  "agent-commands",
  "--sync",
  ...(remove ? ["--remove"] : []),
  ...(dryRun ? ["--dry-run"] : []),
  ...(force ? ["--force"] : []),
  ...(agents.length > 0 ? ["--agent", agents.join(",")] : []),
  ...selectionArgs(selection),
];

/** Append the instruction block to the selected agents' instruction files. */
export const rulesTask = (agents = []) => ({
  id: "rules",
  title: "Instruction files",
  detail: agents.length > 0 ? agents.join(", ") : "every instruction file on this machine",
  run: ({ dryRun }) => {
    const results = applyRules({ dryRun, agents });

    return {
      status: "ok",
      summary: `${results.length} file(s)`,
      lines: results.map((entry) => `${entry.status.padEnd(8)} ${entry.file}`),
    };
  },
});

/** Write the rule-mcp-* slash commands into the selected agents' directories. */
export const commandsTask = (force, agents = [], selection = null) => ({
  id: "commands",
  title: "Agent slash commands",
  detail: `${agents.length > 0 ? agents.join(", ") : "every detected agent directory"} - ${selectionLabel(selection)}`,
  run: async ({ dryRun }) => {
    const result = await runCliCommand(commandSyncArgs({ agents, dryRun, force, selection }));

    return {
      status: result.ok ? "ok" : "warn",
      summary: result.ok ? "synced" : "failed",
      lines: result.lines.slice(-6),
    };
  },
});

/** Copy the bundled skill catalog to the central skills directory. */
export const skillsTask = () => ({
  id: "skills",
  title: "Bundled rule-mcp-* skills",
  detail: "~/.agents/skills",
  run: async ({ dryRun }) => {
    if (dryRun) {
      return { status: "ok", summary: "would install to ~/.agents/skills" };
    }

    const result = await runCliCommand(["skills", "install", "--all"]);

    return {
      status: result.ok ? "ok" : "warn",
      summary: result.ok ? "installed" : "had issues",
      lines: result.lines.slice(-6),
    };
  },
});

/** Register the platform-native background service. */
export const serviceTask = () => ({
  id: "service",
  title: "Platform daemon service",
  detail: "LaunchAgent, systemd user unit, or Windows service",
  run: ({ dryRun }) => {
    const result = installDaemonService({ dryRun });

    return { status: result.ok ? "ok" : "warn", summary: `${result.service} on ${result.platform}` };
  },
});

/** Bring the containerized SSE service up. */
export const dockerTask = () => ({
  id: "docker",
  title: "Docker SSE service",
  detail: "docker compose up -d",
  run: ({ dryRun }) => {
    const result = dockerComposeUp({ dryRun });

    return { status: result.status === "blocked" ? "warn" : "ok", summary: statusText(result) };
  },
});

/** Run the health check and show its tail. */
export const doctorTask = () => ({
  id: "doctor",
  title: "Health check",
  detail: "rule-mcp doctor",
  run: async ({ dryRun }) => {
    if (dryRun) {
      return { status: "ok", summary: "would run rule-mcp doctor" };
    }

    const result = await runCliCommand(["doctor"]);

    return {
      status: result.ok ? "ok" : "warn",
      summary: result.ok ? "passed" : "reported issues",
      lines: result.lines.slice(-8),
    };
  },
});
