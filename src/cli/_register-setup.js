/**
 * Lifecycle command registrars: install and uninstall.
 *
 * The handlers are imported inside the actions, not at the top of the file:
 * the command declarations are what `--help` renders, and a static handler
 * import made `--help`, `--version` and `config` pay for the server, both
 * transports, the skill catalog and the tool registrations - same pattern
 * the adr and skills registrars already used - see `pnpm report:startup`.
 */
import { Option } from "commander";

import { commanderIo } from "./_register-wizard.js";

const MODE_HELP = "stdio (default), daemon (SSE), docker, or skills (no MCP server, ADR 079)";

/**
 * Options only the wizard's plan performs, by the flag that asks for them.
 *
 * `install` without a wizard is the narrow command it always was: it writes
 * the mcp.json entry and the router command file, and nothing else. Every
 * step below belongs to the plan, so a flag naming one is a flag this path
 * cannot honor.
 */
const WIZARD_ONLY = {
  rules: "--rules",
  commands: "--commands",
  hooks: "--hooks",
  skills: "--skills",
  service: "--service",
  doctor: "--doctor",
  commandsPreset: "--commands-preset",
  commandsFamilies: "--commands-families",
  commandsAreas: "--commands-areas",
  commandsSkills: "--commands-skills",
};

/**
 * Say so when a flag the plan owns was given to a run that has no plan.
 *
 * Silence here is the failure the commands step exists to remove: a question
 * asked, answered, and dropped.
 *
 * @param {object} options
 * @param {(text: string) => void} [warn]
 */
export function warnWizardOnly(options, warn = (text) => process.stderr.write(`${text}\n`)) {
  const given = Object.entries(WIZARD_ONLY)
    // `--no-rules` is honored by definition; only a flag asking for a step is dropped.
    .filter(([key]) => options[key] !== undefined && options[key] !== false)
    .map(([, flag]) => flag);

  if (given.length > 0) {
    warn(`install: ${given.join(", ")} need the wizard - run \`rule-mcp setup\` (it runs the same plan when piped).`);
  }

  return given;
}

/** Register the `install` command. */
export function registerInstallCommand(program) {
  program
    .command("install")
    .description("Install rule-mcp into an agent/IDE (edits mcp.json)")
    .option("--agent <name>", "target agent, or 'all' for every supported agent", "all")
    .addOption(new Option("--mode <name>", MODE_HELP).choices(["stdio", "daemon", "sse", "docker", "skills"]))
    .option("--global", "use clean command path (requires global install)")
    .option("--force", "override existing configuration")
    .option("--dry-run", "preview without writing")
    .option("--json", "print machine-readable JSON instead of Terminal UI")
    .option("--no-wizard", "skip the full-screen wizard even on a terminal")
    .option("--no-interactive", "run the plan with defaults and no wizard")
    .option("--rules", "write agent instruction files")
    .option("--no-rules", "skip agent instruction files")
    .option("--commands", "write agent slash commands")
    .option("--no-commands", "skip agent slash commands")
    .option("--hooks", "install guard hooks (Claude)")
    .option("--no-hooks", "skip guard hooks")
    .option("--skills", "install the bundled rule-* skills")
    .option("--no-skills", "skip the bundled skills")
    .option("--minimal", "minimal server tool surface (--no-minimal for full)")
    .option("--surface <spec>", "server tool surface: minimal, standard, full, areas:<a,b> or skills:<s,...>")
    .option("--service", "register the platform daemon service")
    .option("--no-service", "skip the platform daemon service")
    .option("--doctor", "run the health check at the end")
    .option("--no-doctor", "skip the health check")
    .addOption(new Option("--commands-preset <name>", "which commands to write: minimal, standard or full").choices(["minimal", "standard", "full"]))
    .option("--commands-families <list>", "comma-separated: areas, personas, tasks")
    .option("--commands-areas <list>", "comma-separated area names, e.g. frontend,data")
    .option("--commands-skills <list>", "comma-separated skill names")
    .allowExcessArguments(false)
    .action(async (options) => {
      if (options.mode === "skills") {
        await (await import("./install/_skills-mode.js")).installSkillsOnly(options);

        return;
      }

      // A terminal gets the full-screen wizard (src/cli/setup/); a pipe, CI
      // job, --json or --no-wizard gets the same plan via the flag path.
      // The wizard is lazy: --help never loads Ink or React.
      if (!options.json && options.wizard !== false && options.interactive !== false) {
        const { setupRan } = await import("./setup/_entry.js");
        const io = commanderIo(program, options);

        if (await setupRan("install", io)) {
          return;
        }
      }

      warnWizardOnly(options);

      (await import("./commands/_lifecycle.js")).installCommand({
        agent: options.agent,
        mode: options.mode ?? "stdio",
        global: options.global,
        force: options.force,
        dryRun: options.dryRun,
        json: options.json,
        minimal: options.minimal,
        surface: options.surface,
      });
    });
}

/** Register the `uninstall` command. */
export function registerUninstallCommand(program) {
  program
    .command("uninstall")
    .description("Remove rule-mcp from an agent/IDE")
    .option("--agent <name>", "target agent, or 'all' for every configured agent", "all")
    .option("--dry-run", "preview without removing")
    .option("--json", "print machine-readable JSON instead of Terminal UI")
    .option("--no-wizard", "skip the full-screen wizard even on a terminal")
    .option("--no-interactive", "run the plan with defaults and no wizard")
    .option("--purge", "also remove the runtime home and caches")
    .option("--keep-config", "keep user configuration when purging")
    .allowExcessArguments(false)
    .action(async (options) => {
      if (!options.json && options.wizard !== false && options.interactive !== false) {
        const { setupRan } = await import("./setup/_entry.js");
        const io = commanderIo(program, options);

        if (await setupRan("uninstall", io)) {
          return;
        }
      }

      (await import("./commands/_lifecycle.js")).uninstallCommand({ agent: options.agent, dryRun: options.dryRun, json: options.json });
    });
}
