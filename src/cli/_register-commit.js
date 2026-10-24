/**
 * @module cli/register-commit
 *
 * The `commit-lint` command declaration. The handler is imported inside the
 * action, so `--help` and `--version` stay off the core/commit import graph.
 */
import { readFileSync } from "node:fs";

/** Register the `commit-lint` command. */
export function registerCommitLintCommand(program) {
  program
    .command("commit-lint")
    .description("Validate commits against type(scope): subject (the git hooks call this)")
    .option("--msg-file <path>", "validate a commit-message file (commit-msg hook)")
    .option("--range <revspec>", "validate every commit in a revision range")
    .option("--base <ref>", "base ref for the range")
    .option("--head <ref>", "head ref for the range (default: HEAD)")
    .option("--stdin-push", "validate the refs git is about to push, read from stdin (pre-push hook)")
    .option("--dir <path>", "project directory (default: cwd)")
    .allowExcessArguments(false)
    .action(async (options) => {
      const { commitLintCommand } = await import("./commands/_commit.js");
      let stdin = "";

      if (options.stdinPush) {
        try {
          stdin = readFileSync(0, "utf8");
        } catch {
          // No pipe (an interactive terminal): nothing is being pushed.
        }
      }

      process.exitCode = commitLintCommand(
        {
          msgFile: options.msgFile,
          range: options.range,
          base: options.base,
          head: options.head,
          stdinPush: options.stdinPush,
          projectDir: options.dir,
        },
        { stdin },
      );
    });
}
