/** Install and uninstall commands (agent catalog + service). */

import { entrypoint, print, printJson } from "./_shared.js";
import { applySurfaceEnv, surfaceOf } from "../install/_surface-flags.js";
import { applyMinimalEnv } from "../setup/_options.js";
import { formatInstallResult, formatUninstallResult } from "../_tui-formats.js";
import { installAgent } from "../install/index.js";
import { uninstallFromAgent } from "../_uninstall.js";
import { forgetInstall, readManifest, recordInstall } from "../install/_manifest.js";
import { getRuntimePaths } from "../paths/index.js";
import { rmSync } from "node:fs";
import { join } from "node:path";
function installCommand(opts) {
  // The narrow path owns no plan, but both answers still have to land: same
  // mirror the plan tasks use (see cli/installers/_env.js).
  const surface = typeof opts.surface === "string" ? surfaceOf({ surface: opts.surface }) : (opts.surface ?? null);
  applyMinimalEnv(surface ? undefined : opts.minimal);
  applySurfaceEnv(surface);

  const result = installAgent({
    agent: opts.agent,
    force: opts.force,
    dryRun: opts.dryRun,
    global: opts.global,
    mode: opts.mode,
    entrypoint,
  });
  if (opts.json) {
    printJson(result);
  } else {
    print(formatInstallResult(result));
  }

  if (result.ok && !opts.dryRun) {
    recordInstall({ agent: opts.agent, mode: opts.mode ?? "stdio", dryRun: opts.dryRun });
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}

/**
 * Uninstall rule-mcp from an agent/IDE.
 * Removes the rule-mcp entry from the agent config file.
 *
 * @param {{ agent: string, dryRun: boolean }} opts
 */
function uninstallCommand(opts) {
  // "all" answers what this machine recorded, so an uninstall never relies on
  // re-detecting an agent whose config an earlier release already removed.
  const recorded = readManifest().agents;
  const targets = opts.agent === "all" && recorded.length > 0 ? recorded : [opts.agent];
  const results = targets.map((agent) => uninstallFromAgent({ agent, dryRun: opts.dryRun }));
  const result = {
    ok: results.every((entry) => entry.ok),
    dryRun: opts.dryRun,
    note: `Removed rule-mcp from ${targets.join(", ")}.`,
    agents: results.flatMap((entry) => entry.agents),
    uninstalled: Object.assign({}, ...results.map((entry) => entry.uninstalled)),
  };

  if (result.ok && !opts.dryRun) {
    for (const agent of result.agents) {
      forgetInstall({ agent, dryRun: opts.dryRun });
    }

    if (opts.purge) {
      const home = getRuntimePaths().homeDir;

      if (opts.keepConfig) {
        for (const dir of ["projects", "state", "data"]) {
          rmSync(join(home, dir), { recursive: true, force: true });
        }
      } else {
        rmSync(home, { recursive: true, force: true });
      }
    }
  }

  if (opts.json) {
    printJson(result);
  } else {
    print(formatUninstallResult(result));
  }
}

/**
 * List or call MCP tools directly.
 *
 * @param {{ subcommand: string, toolName?: string, json?: string }} opts
 */

export { installCommand, uninstallCommand };
