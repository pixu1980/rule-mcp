

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

    return { status: "ok", summary: result.homeDir, lines: result.dirs };
  },
});

/** Create or repair the launcher agent configs point at. */
export const shimTask = (localBin) => ({
  id: "shim",
  title: "Global shim",
  detail: "rule-mcp on PATH",
  run: ({ dryRun }) => {
    const result = ensureGlobalShim({ localBin, dryRun });

    return { status: result.status === "unwritable" ? "warn" : "ok", summary: `${statusText(result)}${result.path ? ` - ${result.path}` : ""}` };
  },
});

/** Remove every launcher and linked store entry this installer created. */
export const shimRemovalTask = () => ({
  id: "shim",
  title: "Global shim",
  detail: "launchers and pnpm global links",
  run: ({ dryRun }) => {
    const results = removeGlobalShims({ dryRun });

    return { status: "ok", summary: `${results.length} entr${results.length === 1 ? "y" : "ies"}`, lines: results.map((entry) => `${entry.status.padEnd(8)} ${entry.path}`) };
  },
});

/** Write this server into one agent's config. */
export const agentInstallTask = (agent, mode, force) => ({
  id: `agent:${agent}`,
  title: `Configure ${agent}`,
  detail: `mode ${mode}`,
  run: ({ dryRun }) => {
    const result = installAgent({ agent, entrypoint, dryRun, force, mode });
    const outcome = result.installed[agent] ?? {};

    if (outcome.error) {
      return { status: "warn", summary: outcome.error };
    }

    return { status: "ok", summary: dryRun ? "would configure" : "configured" };
  },
});

/** Remove this server from one agent's config. */
export const agentRemovalTask = (agent) => ({
  id: `agent:${agent}`,
  title: `Clean ${agent}`,
  detail: "remove the mcp.json entry",
  run: ({ dryRun }) => {
    const result = uninstallFromAgent({ agent, dryRun });
    const outcome = result.uninstalled[agent] ?? {};

    if (outcome.error) {
      return { status: "warn", summary: outcome.error };
    }

    return { status: "ok", summary: dryRun ? "would remove" : "removed" };
  },
});
