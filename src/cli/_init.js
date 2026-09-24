

/**
 * @module cli/init
 *
 * `rule-mcp init`: prepare a project for this server.
 *
 * Three things, all idempotent:
 *
 *   1. Move a local `./.rule-mcp` into `~/.rule-mcp/projects/`, if
 *      an earlier version left one behind, and create the central directory
 *      this project records into. No recorder state is written into the project.
 *   2. Give the repository git governance: detect its hook mechanism (Husky, a
 *      tracked `.githooks/`, a configured `core.hooksPath`, or git's own hooks
 *      directory), install Husky when a Node project has none, and install the
 *      `commit-msg` and `pre-push` gates that enforce `type(scope): subject`.
 *      What already exists is integrated, never replaced.
 *   3. Run `tokensave init` when tokensave is installed. The two tools are used
 *      together, tokensave's code graph is what lets this server stop dumping
 *      file trees into the context, and a project prepared for one is almost
 *      always meant to be prepared for the other. Its failure is reported,
 *      never inherited - it is not our command.
 *
 * @see module:cli/paths - where a project's recording lives, and the migration
 * @see module:core/commit - the git governance step
 */

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { installGitGovernance } from "../core/commit/index.js";
import { findProjectRoot, getProjectPaths } from "./paths/index.js";

/**
 * Find the tokensave binary, or nothing.
 *
 * @returns {string|undefined}
 */
function findTokensave() {
  try {
    return (
      execFileSync("command", ["-v", "tokensave"], {
        encoding: "utf8",
        shell: "/bin/sh",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || undefined
    );
  } catch {
    return;
  }
}

/**
 * Prepare a project directory.
 *
 * @param {{
 *   projectDir?: string,
 *   tokensave?: boolean,
 *   tokensaveBinary?: () => (string|undefined),
 *   run?: (binary: string, args: string[], options: object) => void,
 * }} [options]
 * @returns {{ projectDir: string, dir: string, created: boolean, tokensave?: string }}
 */
export function initProject(options = {}) {
  const projectDir = options.projectDir ? findProjectRoot(options.projectDir) : getProjectPaths().projectDir;
  const { dir } = getProjectPaths(projectDir);

  let created = true;
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    created = false;
  }

  let tokensave;

  if (options.tokensave !== false) {
    const binary = (options.tokensaveBinary ?? findTokensave)();

    if (binary) {
      const run = options.run ?? ((command, args, runOptions) => execFileSync(command, args, { ...runOptions, stdio: "ignore" }));
      try {
        run(binary, ["init"], { cwd: projectDir });
        tokensave = "initialized";
      } catch (error) {
        tokensave = `failed: ${error.message}`;
      }
    } else {
      tokensave = "not installed";
    }
  }

  let governance;

  if (options.gitGovernance !== false) {
    try {
      governance = installGitGovernance(projectDir, { run: options.run, husky: options.husky, command: options.command });
    } catch (error) {
      governance = { mechanism: "none", hooks: {}, prepare: "missing", actions: [`failed: ${error.message}`] };
    }
  }

  return { projectDir, dir, created, tokensave, governance };
}

/**
 * Render the result for a terminal.
 *
 * @param {object} result - from {@link initProject}
 * @returns {string}
 */
export function renderInit(result) {
  const lines = [`Project:      ${result.projectDir}`, `Recorder dir: ${result.dir}${result.created ? "" : " (could not be created)"}`];

  if (result.tokensave) {
    lines.push(`tokensave:    ${result.tokensave}`);
  }

  if (result.governance) {
    const { mechanism, hooks = {}, actions = [] } = result.governance;
    const installed = Object.entries(hooks)
      .map(([name, outcome]) => `${name} ${outcome}`)
      .join(", ");

    lines.push(`Git:          ${mechanism === "none" ? "no git repository" : mechanism}${installed ? ` (${installed})` : ""}`);

    for (const action of actions) {
      lines.push(`              ${action}`);
    }
  }

  return lines.join("\n");
}
