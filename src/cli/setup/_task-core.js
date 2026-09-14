/**
 * @module cli/setup/task-core
 *
 * The tasks every install runs: the runtime home, the global shim, and one
 * row per agent config.
 *
 * A task is data with a `run` on it. Building one performs no work, so the
 * review screen can list the whole plan before a single file is touched.
 */

import { entrypoint } from "../commands/_shared.js";
import { installAgent } from "../install/index.js";
import { applySurfaceEnv, surfaceSpec } from "../install/_surface-flags.js";
import { applyMinimalEnv } from "./_options.js";
import { uninstallFromAgent } from "../_uninstall.js";
import { ensureRuntimeHome } from "./_runtime-home.js";
import { ensureGlobalShim, removeGlobalShims } from "./_shim-apply.js";

/** Render a `{ status, reason }` result as one line of summary text. */
export const statusText = (result) => `${result.status}${result.reason ? ` - ${result.reason}` : ""}`;

/** Recreate the directory layout `src/cli/paths/_runtime.js` expects. */
export const runtimeHomeTask = () => ({
  id: "runtime-home",
  title: "Runtime home",
  detail: "~/.rule-mcp/{state,data,projects,config}",
  run: ({ dryRun }) => {
    const result = ensureRuntimeHome({ dryRun });

    return {
      status: "ok",
      summary: result.homeDir,
      lines: [...result.dirs, `switches: config/env.json ${result.settings}`],
    };
  },
});

/** Create or repair the launcher agent configs point at. */
export const shimTask = (localBin) => ({
  id: "shim",
  title: "Global shim",
  detail: "rule-mcp on PATH",
  run: ({ dryRun }) => {
    const result = ensureGlobalShim({ localBin, dryRun });

    return {
      status: result.status === "unwritable" ? "warn" : "ok",
      summary: `${statusText(result)}${result.path ? ` - ${result.path}` : ""}`,
    };
  },
});

/** Remove every launcher and linked store entry this installer created. */
export const shimRemovalTask = () => ({
  id: "shim",
  title: "Global shim",
  detail: "launchers and pnpm global links",
  run: ({ dryRun }) => {
    const results = removeGlobalShims({ dryRun });
    // A sandboxed run reports one skipped row, which is not one entry removed.
    // Counting the statuses rather than the rows is what keeps the summary
    // from claiming work that was declined.
    const removed = results.filter((entry) => entry.status !== "skipped");
    const summary =
      removed.length === 0
        ? (results[0]?.status ?? "nothing found")
        : `${removed.length} entr${removed.length === 1 ? "y" : "ies"}`;

    return { status: "ok", summary, lines: results.map((entry) => `${entry.status.padEnd(8)} ${entry.path}`) };
  },
});

/**
 * Write this server into one agent's config.
 *
 * `hooks` reaches the Claude installer, which is the only one that writes a
 * PreToolUse guard: a user who declined the guard screen must not get one
 * anyway because the agent screen selected Claude. `minimal` and `surface`
 * land in the process env just before the write, which the writers mirror
 * into the server env (see cli/installers/_env.js); an answered Surface
 * step owns the surface, the older toggle only applies when it was skipped.
 */
export const agentInstallTask = (agent, mode, force, hooks = true, minimal, surface) => ({
  id: `agent:${agent}`,
  title: `Configure ${agent}`,
  detail: `mode ${mode}${agent === "claude" && !hooks ? ", no guard hooks" : ""}${minimal === true && !surface ? ", minimal tools" : ""}${surface ? `, ${surfaceSpec(surface)} tools` : ""}`,
  run: ({ dryRun }) => {
    applyMinimalEnv(surface ? undefined : minimal);
    applySurfaceEnv(surface);

    const result = installAgent({ agent, entrypoint, dryRun, force, mode, hooks });
    const outcome = result.installed[agent] ?? {};

    if (outcome.error) {
      return { status: "warn", summary: outcome.error };
    }

    const notes = result.warnings?.length ? ` - ${result.warnings.join("; ")}` : "";

    return { status: "ok", summary: `${dryRun ? "would configure" : "configured"}${notes}` };
  },
});

/**
 * Remove this server from one agent's config.
 *
 * `commands` defaults to false because in a plan the command files belong to
 * the "Agent slash commands" group. Deleting them here as well made that
 * group's tick decorative: unticking it removed the files anyway.
 */
export const agentRemovalTask = (agent, { commands = false } = {}) => ({
  id: `agent:${agent}`,
  title: `Clean ${agent}`,
  detail: commands ? "remove the mcp.json entry and the command files" : "remove the mcp.json entry only",
  run: ({ dryRun }) => {
    const result = uninstallFromAgent({ agent, dryRun, commands });
    const outcome = result.uninstalled[agent] ?? {};

    if (outcome.error) {
      return { status: "warn", summary: outcome.error };
    }

    return { status: "ok", summary: dryRun ? "would remove" : "removed" };
  },
});
