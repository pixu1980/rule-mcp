

/**
 * @module cli/register-wizard
 *
 * The `setup` command, and the adapter that lets commander drive it.
 *
 * Split out of `_register-setup.js` because the wizard declares every flag
 * twice - once on `install` and once here - and a registrar file that holds
 * both is a file nobody reads to the end (ADR 058).
 */
import { Option } from "commander";

/**
 * Read one parsed flag back out of a commander options object.
 *
 * `src/cli/setup/_entry.js` expects the hand-rolled `{ getArgument,
 * hasFlag }` readers; this adapts a parsed options object (plus the raw
 * argv for `--no-*` negations commander folds into booleans) so the wizard
 * and the plain runner see the same flags.
 */
export function commanderIo(program, options, argv = process.argv) {
  const getArgument = (name) => {
    const key = name.replace(/^--/, "").replaceAll(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = options[key];

    return typeof value === "string" ? value : undefined;
  };
  // Commander folds `--thing`/`--no-thing` into `options.thing` (true/false/
  // undefined), so the flag readers consult the parsed object first and the
  // raw argv only as a fallback. This keeps `--no-rules` meaningful when the
  // options object was built by hand (tests, embedding) rather than parsed.
  const hasFlag = (name) => {
    if (argv.includes(name)) {
      return true;
    }

    const positive = name.startsWith("--no-")
      ? name.slice(5).replaceAll(/-([a-z])/g, (_, c) => c.toUpperCase())
      : name.replace(/^--/, "").replaceAll(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = options[positive];

    if (typeof value !== "boolean") {
      return false;
    }

    return name.startsWith("--no-") ? value === false : value === true;
  };

  return { getArgument, getArguments: () => [], hasFlag, program, options };
}

/** Register the `setup` wizard: full-screen on a terminal, plain otherwise. */
export function registerSetupCommand(program) {
  program
    .command("setup")
    .description("Full-screen install/uninstall wizard (falls back to flags when piped)")
    .option("--agent <name>", "narrow the run to one target")
    .option("--mode <name>", "stdio (default), daemon (SSE), or docker", "stdio")
    .option("--uninstall", "run the uninstall direction")
    .option("--rules", "write agent instruction files")
    .option("--no-rules", "skip agent instruction files")
    .option("--commands", "write agent slash commands")
    .option("--no-commands", "skip agent slash commands")
    .option("--hooks", "install guard hooks (Claude)")
    .option("--no-hooks", "skip guard hooks")
    .option("--skills", "install the bundled rule-mcp-* skills")
    .option("--no-skills", "skip the bundled skills")
    .option("--minimal", "minimal server tool surface (--no-minimal for full)")
    .option("--no-minimal", "full server tool surface")
    .option("--surface <spec>", "server tool surface: minimal, standard, full, areas:<a,b> or skills:<s,...>")
    .option("--service", "register the platform daemon service")
    .option("--no-service", "skip the platform daemon service")
    .option("--doctor", "run the health check at the end")
    .option("--no-doctor", "skip the health check")
    .addOption(new Option("--commands-preset <name>", "which commands to write: minimal, standard or full").choices(["minimal", "standard", "full"]))
    .option("--commands-families <list>", "comma-separated: areas, personas, tasks")
    .option("--commands-areas <list>", "comma-separated area names, e.g. frontend,data")
    .option("--commands-skills <list>", "comma-separated skill names")
    .option("--purge", "also remove the runtime home and caches (uninstall)")
    .option("--keep-config", "keep user configuration when purging")
    .option("--force", "override existing configuration")
    .option("--dry-run", "preview without writing")
    .option("--no-wizard", "run the plan with flags and no wizard")
    .option("--no-interactive", "run the plan with defaults and no wizard")
    .option("--json", "print machine-readable output instead of the wizard")
    .allowExcessArguments(false)
    .action(async (options) => {
      const { runSetup } = await import("./setup/index.js");
      const { setupOptions } = await import("./setup/_entry.js");

      await runSetup(setupOptions(options.uninstall ? "uninstall" : "install", commanderIo(program, options)));
    });
}
