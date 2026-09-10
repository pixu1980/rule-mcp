/**
 * src/cli/setup: the install and uninstall wizard.
 *
 * One entry point for both directions. `runSetup` decides whether this
 * terminal can host the full-screen wizard and falls back to the plain
 * runner when it cannot. The shell and PowerShell scripts are bootstraps
 * that check Node and call in here (ADR 080).
 */

import { InstallApp } from "./_app-install.js";
import { UninstallApp } from "./_app-uninstall.js";
import { mountWizard } from "./_mount.js";
import { installNextSteps, uninstallNextSteps } from "./_next-steps.js";
import { printSummary, runPlain } from "./_plain.js";
import { buildInstallPlan } from "./_plan-install.js";
import { buildUninstallPlan } from "./_plan-uninstall.js";
import { preflight } from "./_preflight.js";
import { resolveSetupOptions } from "./_options.js";
import { scanInstallation } from "./_scan.js";
import { detectInstalledAgents } from "../install/index.js";

export * from "./_options.js";
export * from "./_plan-install.js";
export * from "./_plan-uninstall.js";
export * from "./_preflight.js";
export * from "./_scan.js";

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
    const outcome = await mountWizard(InstallApp, { defaults: options });

    settleExit(printSummary({ ...outcome, title: "rule-mcp setup", nextSteps: installNextSteps({ mode: options.mode, dryRun: outcome.dryRun }) }));

    return;
  }

  const agents =
    options.agents ??
    detectInstalledAgents()
      .filter((agent) => agent.configFile)
      .map((agent) => agent.name);
  const plan = buildInstallPlan({ agents, mode: options.mode, extras: Object.fromEntries(options.extras.map((id) => [id, true])), force: options.force, context });
  const { counts } = await runPlain({ plan, dryRun: options.dryRun, title: "rule-mcp setup", nextSteps: installNextSteps({ mode: options.mode, dryRun: options.dryRun }) });

  settleExit(counts);
}

/** The uninstall direction, with or without a wizard. */
async function uninstall(options) {
  if (options.interactive) {
    const outcome = await mountWizard(UninstallApp, { defaults: options });

    settleExit(printSummary({ ...outcome, title: "rule-mcp uninstall", nextSteps: uninstallNextSteps({ dryRun: outcome.dryRun, purged: options.purge }) }));

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

  await (options.uninstall ? uninstall(resolved) : install(resolved));
}
