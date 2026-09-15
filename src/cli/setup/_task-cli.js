/**
 * @module cli/setup/task-cli
 *
 * The install's proof that the launcher it wrote answers: a shim on PATH that
 * does not run is an install that failed, so this task fails the run.
 */

import { verifyGlobalCli } from "./_cli-verify.js";

/** Prove the global `rule-mcp` CLI on PATH actually answers. */
export const cliVerifyTask = () => ({
  id: "cli",
  title: "Global CLI",
  detail: "rule-mcp --version, tools list and doctor answer",
  run: async ({ dryRun }) => {
    if (dryRun) {
      return { status: "ok", summary: "would verify rule-mcp on PATH" };
    }

    const result = verifyGlobalCli();

    if (result.status === "ok") {
      return { status: "ok", summary: result.path, lines: result.lines };
    }

    if (result.status === "skipped") {
      return { status: "skip", summary: result.reason };
    }

    return { status: "fail", summary: result.reason, lines: result.path ? [result.path] : [] };
  },
});
