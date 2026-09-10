/**
 * @module cli/setup/task-extras
 *
 * The optional tasks: instruction files, slash commands, bundled skills, the
 * commit hook, the platform service, Docker, and the closing health check.
 *
 * Steps that print (skills, agent-commands, doctor) run out of process so
 * their stdout never lands in the middle of the wizard's frame.
 */

import { installDaemonService } from "../daemon/index.js";
import { dockerComposeUp } from "./_docker.js";
import { runCliCommand } from "./_exec.js";
import { installGitHook } from "./_git-hook-apply.js";
import { applyRules } from "./_rules-apply.js";
import { statusText } from "./_task-core.js";

/** Append the instruction block to every agent instruction file present. */
export const rulesTask = () => ({
  id: "rules",
  title: "Instruction files",
  detail: "CLAUDE.md, GEMINI.md, AGENTS.md, .cursorrules",
  run: ({ dryRun }) => {
    const results = applyRules({ dryRun });

    return { status: "ok", summary: `${results.length} file(s)`, lines: results.map((entry) => `${entry.status.padEnd(8)} ${entry.file}`) };
  },
});

/** Write the rule-* slash commands into every detected agent directory. */
export const commandsTask = (force) => ({
  id: "commands",
  title: "Agent slash commands",
  detail: "every detected agent directory",
  run: async ({ dryRun }) => {
    const result = await runCliCommand(["agent-commands", "--sync", ...(dryRun ? ["--dry-run"] : []), ...(force ? ["--force"] : [])]);

    return { status: result.ok ? "ok" : "warn", summary: result.ok ? "synced" : "failed", lines: result.lines.slice(-6) };
  },
});

/** Copy the bundled skill catalog to the central skills directory. */
export const skillsTask = () => ({
  id: "skills",
  title: "Bundled rule-* skills",
  detail: "~/.agents/skills",
  run: async ({ dryRun }) => {
    if (dryRun) {
      return { status: "ok", summary: "would install to ~/.agents/skills" };
    }

    const result = await runCliCommand(["skills", "install", "--all"]);

    return { status: result.ok ? "ok" : "warn", summary: result.ok ? "installed" : "had issues", lines: result.lines.slice(-6) };
  },
});

/** Add the background health check to the repository's post-commit hook. */
export const gitHookTask = () => ({
  id: "git-hook",
  title: "Git post-commit hook",
  detail: "background health check after each commit",
  run: ({ dryRun }) => {
    const result = installGitHook({ dryRun });

    return { status: result.status === "no-repo" ? "skip" : "ok", summary: result.file ? `${result.status} - ${result.file}` : "not a git repository" };
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

    return { status: result.ok ? "ok" : "warn", summary: result.ok ? "passed" : "reported issues", lines: result.lines.slice(-8) };
  },
});
