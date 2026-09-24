

/**
 * @module cli/commands/commit
 *
 * `rule-mcp commit-lint`: the gate the `commit-msg` and `pre-push` hooks
 * invoke.
 *
 * Three inputs, one rule: a message file (what `commit-msg` is handed), a
 * revision range, or the refs `pre-push` receives on stdin. The rule itself
 * lives in `core/commit`; this module only reads the input and renders the
 * verdict.
 */

import { readFileSync } from "node:fs";

import { lintMessage, lintPush, lintRange, renderViolations, violationHelp } from "../../core/commit/index.js";

/** The prefix every line of the report carries. */
const TAG = "commit-lint";

/**
 * Run the gate.
 *
 * @param {{ msgFile?: string, range?: string, base?: string, head?: string, stdinPush?: boolean, projectDir?: string }} options
 * @param {{ stdin?: string, write?: (text: string) => void, writeError?: (text: string) => void }} [io]
 * @returns {number} the process exit code
 */
export function commitLintCommand(options = {}, io = {}) {
  const { stdin = "", write = (text) => process.stdout.write(text), writeError = (text) => process.stderr.write(text) } = io;

  if (options.msgFile) {
    const verdict = lintMessage(readFileSync(options.msgFile, "utf8"));

    if (verdict.exempt) {
      write(`${TAG}: system-generated message, exempt\n`);

      return 0;
    }

    if (verdict.valid) {
      write(`${TAG}: the message follows type(scope).\n`);

      return 0;
    }

    writeError(`${TAG}: rejected - ${verdict.reason}\n${violationHelp(verdict.subject)}\n`);

    return 1;
  }

  const projectDir = options.projectDir ?? process.cwd();
  const range = options.range ?? (options.base ? `${options.base}..${options.head ?? "HEAD"}` : "");

  if (!options.stdinPush && !range) {
    writeError(`${TAG}: --msg-file, --range (or --base), or --stdin-push is required\n`);

    return 1;
  }

  const result = options.stdinPush ? lintPush(projectDir, stdin) : lintRange(projectDir, range);

  if (result.violations.length > 0) {
    for (const line of renderViolations(result.violations)) {
      writeError(`${line}\n`);
    }

    writeError(`\n${TAG}: ${result.violations.length} commit(s) blocked\n${violationHelp()}\n`);

    return 1;
  }

  write(`${TAG}: ${result.linted} commit(s) follow type(scope).\n`);

  return 0;
}
