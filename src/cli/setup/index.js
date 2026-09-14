/**
 * src/cli/setup: the install and uninstall wizard.
 *
 * One entry point for both directions. `runSetup` decides whether this
 * terminal can host the full-screen wizard and falls back to the plain
 * runner when it cannot. The shell and PowerShell scripts are bootstraps
 * that check node and call in here (ADR 080).
 *
 * The split inside this folder is deliberate. `_options`, `_plan-*`,
 * `_preflight`, `_scan` and `_run-plan` are pure or read-only and hold the
 * whole flow, which is why the installer can be tested without a terminal;
 * the `_app-*`, `_step-*` and `_widget-*` files are the only ones that know
 * Ink exists, and they are imported lazily so a `--help` or a piped install
 * never loads a renderer it will not draw with.
 */

import { installNextSteps, uninstallNextSteps } from "./_next-steps.js";
import { printSummary, runPlain } from "./_plain.js";
import { buildInstallPlan } from "./_plan-install.js";
import { buildUninstallPlan } from "./_plan-uninstall.js";
import { preflight } from "./_preflight.js";
import { resolveSetupOptions, wizardRuntimeNote } from "./_options.js";
import { scanInstallation } from "./_scan.js";
import { detectInstalledAgents } from "../install/index.js";

export { agentCatalog, agentRows } from "./_agent-rows.js";
export * from "./_entry.js";
export * from "./_options.js";
export * from "./_plan-install.js";
export * from "./_plan-uninstall.js";
export * from "./_preflight.js";
export * from "./_scan.js";
export * from "./_scan-skills.js";

/** Non-zero exit when any task failed, so CI notices. */
const settleExit = (counts) => {
  if (counts.fail > 0) {
    process.exitCode = 1;
  }
};

/** The install direction, with or without a wizard. */
async function install(options) {
  const { context } = preflight();

  if (context.blocked) {
    process.stderr.write("Preflight failed - run `rule-mcp doctor` for details.\n");
    process.exitCode = 1;

    return;
  }

  if (options.interactive) {
    const [{ InstallApp }, { mountWizard }] = await Promise.all([import("./_app-install.js"), import("./_mount.js")]);
    const outcome = await mountWizard(InstallApp, { defaults: options });

    settleExit(
      printSummary({
        ...outcome,
        title: "rule-mcp setup",
        nextSteps: installNextSteps({ mode: options.mode, dryRun: outcome.dryRun }),
      }),
    );

    return;
  }

  const agents =
    options.agents ??
    detectInstalledAgents()
      .filter((agent) => agent.configFile)
      .map((agent) => agent.name);
  const plan = buildInstallPlan({
    agents,
    mode: options.mode,
    extras: Object.fromEntries(options.extras.map((id) => [id, true])),
    force: options.force,
    context,
    selection: options.selection,
  });
  const { counts } = await runPlain({
    plan,
    dryRun: options.dryRun,
    title: "rule-mcp setup",
    nextSteps: installNextSteps({ mode: options.mode, dryRun: options.dryRun }),
  });

  settleExit(counts);
}

/** The uninstall direction, with or without a wizard. */
async function uninstall(options) {
  if (options.interactive) {
    const [{ UninstallApp }, { mountWizard }] = await Promise.all([
      import("./_app-uninstall.js"),
      import("./_mount.js"),
    ]);
    const outcome = await mountWizard(UninstallApp, { defaults: options });

    settleExit(
      printSummary({
        ...outcome,
        title: "rule-mcp uninstall",
        nextSteps: uninstallNextSteps({ dryRun: outcome.dryRun, purged: options.purge }),
      }),
    );

    return;
  }

  const scan = scanInstallation();
  const groups = scan.groups.filter((group) => group.count > 0).map((group) => group.id);
  const purgeIds = options.purge && !options.keepConfig ? scan.purge.map((target) => target.id) : [];
  const plan = buildUninstallPlan({ agents: options.agents ?? scan.agents, groups, purgeIds });
  const { counts } = await runPlain({
    plan,
    dryRun: options.dryRun,
    title: "rule-mcp uninstall",
    nextSteps: uninstallNextSteps({ dryRun: options.dryRun, purged: purgeIds.length > 0 }),
  });

  settleExit(counts);
}

/**
 * Run the wizard.
 *
 * @param {object} options - the parsed command-line options
 */
export async function runSetup(options = {}) {
  const resolved = resolveSetupOptions(options);
  // A wizard that was asked for and cannot be drawn says so once. Falling back
  // silently reads as the flag path having been chosen, which nobody chose.
  const note = resolved.interactive ? "" : wizardRuntimeNote();

  if (note && options.interactive !== false) {
    process.stdout.write(`${note}\n`);
  }

  await (options.uninstall ? uninstall(resolved) : install(resolved));
}
