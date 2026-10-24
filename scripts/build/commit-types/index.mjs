#!/usr/bin/env node

/**
 * @module scripts/build/commit-types
 *
 * The commit gates' entry point (OSS-19).
 *
 * The rule itself lives in `src/core/commit` and this file only parses argv, so
 * the type list, the subject pattern and the system-message exemption have one
 * definition shared by the `commit-msg` hook, the `pre-push` hook, the CLI and
 * the CI lint:
 *
 *   node scripts/build/commit-types/index.mjs --lint-range <base> <head>
 *   node scripts/build/commit-types/index.mjs --msg-file <path>
 *   node scripts/build/commit-types/index.mjs --stdin-push
 *
 * Relative imports on purpose: CI runs this file with no alias hook loaded.
 */

import { readFileSync } from "node:fs";

import { commitLintCommand } from "../../../src/cli/commands/_commit.js";

export { COMMIT_TYPES, SYSTEM_MESSAGE_PREFIXES, isSystemSubject } from "../../../src/core/commit/index.js";

const USAGE = "usage: commit-types/index.mjs --lint-range <base> <head> | --msg-file <path> | --stdin-push\n";

/**
 * Read the ref lines a `pre-push` hook receives on stdin, or "" off a terminal.
 *
 * @returns {string}
 */
function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

/**
 * Run one gate mode and return its exit code.
 *
 * @param {string[]} args
 * @returns {number}
 */
function run(args) {
  const [flag, first, second] = args;

  if (flag === "--lint-range" && first && second) {
    return commitLintCommand({ range: `${first}..${second}` });
  }

  if (flag === "--msg-file" && first) {
    return commitLintCommand({ msgFile: first });
  }

  if (flag === "--stdin-push") {
    return commitLintCommand({ stdinPush: true }, { stdin: readStdin() });
  }

  process.stderr.write(USAGE);

  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const code = run(process.argv.slice(2));

  if (code !== 0) {
    process.exitCode = code;
  }
}
