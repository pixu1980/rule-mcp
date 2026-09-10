

/** The handoff command registrar. */

/** Register the `handoff` command. */
export function registerHandoffCommand(program) {
  program
    .command("handoff")
    .description("Generate a compressed LLM context handoff summary")
    .argument("[subcommand]", "doctor to repair ADR numbering")
    .option("--dir <path>", "project root (default: .)", ".")
    .option("--format <f>", "full (default), brief, minimal")
    .option("--compress", "aggressively truncate values")
    .option("--mode <m>", "handoff (default) or close-session")
    .option("--fix", "apply the ADR renumber plan")
    .option("--fix-commits", "amend local commit messages to match renumbered ADRs")
    .allowExcessArguments(false)
    .action(async function handoffAction(subcommand, options) {
      if (subcommand === "doctor") {
        const { applyRenumber, planRenumber, renderRenumberPlan, rewriteCommitReferences } = await import("../core/docs-numbering/index.js");
        const projectDir = options.dir;
        const onProgress = ({ message }) => process.stdout.write(`  ${message}\n`);
        const plan = planRenumber({ projectDir, onProgress });
        process.stdout.write(`${renderRenumberPlan(plan, { fix: options.fix })}\n`);
        const authors = plan.authors?.length ?? 0;
        const somethingToFix = plan.renames.length > 0 || plan.indexUnordered || authors > 0;

        if (options.fixCommits) {
          const rewrite = rewriteCommitReferences(plan, { projectDir, onProgress });
          process.stdout.write(
            rewrite.refused ? `Commit messages left alone: ${rewrite.refused}.\n` : `Rewrote ${rewrite.rewritten} commit message(s); ${rewrite.skipped} left for a human.\n`,
          );
        }

        if (options.fix && somethingToFix) {
          const applied = applyRenumber(plan, { projectDir, onProgress });
          process.stdout.write(
            `Renumbered ${applied.renamed} document(s); ${applied.referencesUpdated} file(s) had references updated` +
              `${applied.indexRegenerated ? "; ADR.md regenerated" : ""}` +
              `${applied.authorsNamed > 0 ? `; ${applied.authorsNamed} author(s) named` : ""}.\n`,
          );

          if (!options.fixCommits && plan.renames.length > 0) {
            process.stdout.write("Commit messages were not touched. Add --fix-commits to amend the local ones.\n");
          }
        }

        process.exitCode = somethingToFix && !options.fix ? 1 : 0;

        return;
      }

      const { registerProcessHandoffTool } = await import("../tools/handoff/index.js");
      const { callTool: ct } = await import("../tools/router/index.js");
      registerProcessHandoffTool();
      const handoffRes = await ct("rule_tool_process_handoff", {
        projectDir: options.dir,
        compress: options.compress,
        format: options.format ?? "full",
        mode: options.mode ?? "handoff",
      });

      process.stdout.write(`${handoffRes.content[0].text}\n`);
    });
}
