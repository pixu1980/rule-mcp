/**
 * @module cli/setup/task-remove
 *
 * The removal counterparts: instruction files, slash commands, the legacy git
 * hook block, the platform service, shell profiles, and the purge.
 *
 * Each one is the inverse of a task in `_task-extras.js`. Keeping the pairs
 * visible is what stops an install step from quietly outliving its removal.
 */

import { uninstallDaemonService } from "../daemon/index.js";
import { uninstallGitHooks } from "../../core/_git-hooks.js";
import { runCliCommand } from "./_exec.js";
import { legacyHookFiles } from "./_legacy-hooks.js";
import { removeRules } from "./_rules-apply.js";
import { purgeRuntimeDirs } from "./_runtime-home.js";
import { cleanShellProfiles } from "./_shell-profile.js";
import { commandSyncArgs } from "./_task-extras.js";

/** Strip the managed block from every instruction file that has it. */
export const rulesRemovalTask = () => ({
  id: "rules",
  title: "Instruction files",
  detail: "strip the managed rules block",
  run: ({ dryRun }) => {
    const results = removeRules({ dryRun });

    return {
      status: "ok",
      summary: `${results.length} file(s)`,
      lines: results.map((entry) => `${entry.status.padEnd(8)} ${entry.file}`),
    };
  },
});

/** Remove the rule-* command files from every agent directory. */
export const commandsRemovalTask = () => ({
  id: "commands",
  title: "Agent slash commands",
  detail: "remove the rule-* command files",
  run: async ({ dryRun }) => {
    const result = await runCliCommand(commandSyncArgs({ remove: true, dryRun }));

    return {
      status: result.ok ? "ok" : "warn",
      summary: result.ok ? "removed" : "failed",
      lines: result.lines.slice(-6),
    };
  },
});

/**
 * Delete the catalog directories the skills step copied.
 *
 * Global only, whatever directory the wizard runs in: ADR 031 keeps uninstall
 * out of the project tree, and `--scope project` on the CLI is the way to
 * clean a project's own `.agents/skills`.
 */
export const skillsRemovalTask = () => ({
  id: "skills",
  title: "Bundled rule-* skills",
  detail: "~/.agents/skills and ~/.claude/skills",
  run: async ({ dryRun }) => {
    const result = await runCliCommand(["skills", "uninstall", ...(dryRun ? ["--dry-run"] : [])]);

    return {
      status: result.ok ? "ok" : "warn",
      summary: result.ok ? (dryRun ? "would remove" : "removed") : "failed",
      lines: result.lines.slice(-6),
    };
  },
});

/** Strip the hook block an older install wrote into the global git hooks. */
export const gitHookRemovalTask = () => ({
  id: "git-hook",
  title: "Legacy git hook block",
  detail: "strip the block an older install left behind",
  run: ({ dryRun }) => {
    const files = legacyHookFiles();

    if (files.length === 0) {
      return { status: "skip", summary: "nothing left behind" };
    }

    if (dryRun) {
      return { status: "ok", summary: `${files.length} hook(s) would be cleaned`, lines: files };
    }

    const result = uninstallGitHooks();

    return { status: "ok", summary: `${result.removed.length} hook(s) in ${result.dir}`, lines: result.removed };
  },
});

/** Unregister the platform-native background service. */
export const serviceRemovalTask = () => ({
  id: "service",
  title: "Daemon service",
  detail: "unload and delete the platform service",
  run: ({ dryRun }) => {
    const result = uninstallDaemonService({ dryRun });

    return { status: result.ok ? "ok" : "warn", summary: `${result.service} on ${result.platform}` };
  },
});

/** Delete only the profile lines this installer wrote. */
export const profilesTask = () => ({
  id: "profiles",
  title: "Shell profiles",
  detail: "remove lines this installer wrote",
  run: ({ dryRun }) => {
    const results = cleanShellProfiles({ dryRun });

    return {
      status: "ok",
      summary: `${results.length} file(s)`,
      lines: results.map((entry) => `${entry.status.padEnd(8)} ${entry.file}`),
    };
  },
});

/**
 * Delete the runtime home and the env config directory.
 *
 * Destructive and opt-in: this is the step that takes the SSE token,
 * telemetry, caches and saved API keys with it.
 */
export const purgeTask = (ids) => ({
  id: "purge",
  title: "Purge state and config",
  detail: "delete ~/.rule-mcp, ~/.config/rule-mcp and the compiled-code cache",
  run: ({ dryRun }) => {
    const results = purgeRuntimeDirs({ dryRun, ids });

    return {
      status: "ok",
      summary: `${results.reduce((total, entry) => total + entry.files, 0)} file(s)`,
      lines: results.map((entry) => `${entry.status.padEnd(8)} ${entry.dir}`),
    };
  },
});
