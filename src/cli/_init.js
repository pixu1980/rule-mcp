/**
 * @module cli/init
 *
 * `rule-mcp init`: prepare a project to be recorded in.
 *
 * Two things, both idempotent:
 *
 *   1. Move a local `./.rule-mcp` into `~/.rule-mcp/projects/`, if
 *      an earlier version left one behind, and create the central directory
 *      this project records into (ADR 082). Nothing is written into the project.
 *   2. Run `tokensave init` when tokensave is installed. The two
 *      tools are used together, tokensave's code graph is what lets this server
 *      stop dumping file trees into the context, and a project prepared for one
 *      is almost always meant to be prepared for the other. Its failure is
 *      reported, never inherited - it is not our command.
 *
 * @see module:cli/paths - where a project's recording lives, and the migration
 */

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
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

  return { projectDir, dir, created, tokensave };
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

  return lines.join("\n");
}
