

/**
 * The `init` command: prepare a project for this server.
 *
 * The same work as `rule_tool_init` and `/rule-init`, so the prompt, the tool
 * and the shell cannot drift apart. The handler is imported inside the action:
 * `--help` renders the declarations, and a static import would put the whole
 * init pipeline on the help path.
 *
 * @see module:cli/init - the work, and what each field means
 */

/** Register the `init` command. */
export function registerInitCommand(program) {
  program
    .command("init")
    .description(
      "Prepare a project: recorder directory, git hooks, tokensave and the dependency pin report",
    )
    .option("-d, --dir <path>", "project root (default: the current directory)")
    .option("--no-tokensave", "skip tokensave init")
    .allowExcessArguments(false)
    .action(async function initAction(options) {
      const { initProject, renderInit } = await import("./_init.js");
      const result = initProject({ projectDir: options.dir, tokensave: options.tokensave });

      process.stdout.write(`${renderInit(result)}\n`);
    });
}
