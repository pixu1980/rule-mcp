/** Session command registrars: adr, skills, fix, handon. */
import { fixCommand, skillsReloadCommand } from "./commands/index.js";

/** Register the `adr` command. */
export function registerAdrCommand(program) {
  program
    .command("adr")
    .description("Create a new Architecture Decision Record (ADR)")
    .argument("[action]", "new")
    .argument("[title]")
    .option("--status <s>", "proposed | accepted (default) | deprecated | superseded")
    .option("--context <text>", "context forcing factors")
    .option("--decision <text>", "decision made and why")
    .option("--consequences <text>", "positive and negative consequences")
    .option("--tags <list>", "comma-separated tags (default: architecture)")
    .allowExcessArguments(false)
    .action(async function adrAction(action, title, options, command) {
      if (action !== "new" || !title) {
        command.outputHelp();

        return;
      }

      const { callTool } = await import("../tools/router/index.js");
      const { loadAllSkills } = await import("../core/skills/_skills.js");
      await loadAllSkills();
      const result = await callTool("pix_process_adr", {
        title,
        status: options.status ?? "accepted",
        context: options.context ?? "",
        decision: options.decision ?? "",
        consequences: options.consequences ?? "",
        tags: (options.tags ?? "architecture").split(","),
      });
      process.stdout.write(`${result.content[0].text}\n`);
    });
}

/** Register the `skills` command. */
export function registerSkillsCommand(program) {
  program
    .command("skills")
    .description("Manage the rule AI skill system")
    .argument("[action]", "install | list | reload")
    .option("--scope <s>", "global (default, ~/.agents/skills/) or project (.agents/skills/)", "global")
    .option("--all", "pre-select all skills")
    .option("--json", "list as machine-readable JSON")
    .allowExcessArguments(false)
    .action(async function skillsAction(action, options, command) {
      if (!action) {
        command.outputHelp();

        return;
      }

      switch (action) {
        case "install": {
          const { skillsInstallCommand } = await import("./skills-install.js");
          await skillsInstallCommand({ scope: options.scope, selectAll: options.all });
          break;
        }
        case "list": {
          const { skillsListCommand } = await import("./skills-install.js");
          skillsListCommand({ json: options.json });
          break;
        }
        case "reload": {
          await skillsReloadCommand();
          break;
        }
        default: {
          throw new Error(`Unknown skills action: ${action}. Use 'rule-mcp skills --help'.`);
        }
      }
    });
}

/** Register the `fix` command. */
export function registerFixCommand(program) {
  program
    .command("fix")
    .description("Validate and auto-fix project file tree structure")
    .option("--dir <path>", "project root (default: .)", ".")
    .option("--src-dir <path>", "source directory (default: src)", "src")
    .option("--mode <m>", "lint (scan + report) or fix (scan + auto-correct)", "lint")
    .option("--no-dry-run", "apply fixes instead of previewing")
    .allowExcessArguments(false)
    .action((options) =>
      fixCommand({ dir: options.dir, srcDir: options.srcDir, mode: options.mode, dryRun: options.dryRun }),
    );
}

/** Register the `handon` command. */
export function registerHandonCommand(program) {
  program
    .command("handon")
    .description("Verify the last handoff against the repo now")
    .option("--dir <path>", "project root (default: .)", ".")
    .option("--file <path>", "verify a single handoff file")
    .option("--list", "list handoffs")
    .allowExcessArguments(false)
    .action(async (options) => {
      const { handon } = await import("../tools/handon/index.js");

      process.stdout.write(
        `${handon({ projectDir: options.dir, file: options.file || undefined, list: options.list }).text}\n`,
      );
    });
}
