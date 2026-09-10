#!/usr/bin/env node



/**
 * @module scripts/build/commit-types
 *
 * The single source of truth for commit types (OSS-19).
 *
 * The commit-msg hook and the semantic.yml PR-title check used to accept
 * different lists, so a contributor who passed one failed the other.
 * Both are pinned to this list by tests/docs/commit-gates.test.mjs, and
 * the commit-lint CI job lints through this module so the pattern lives
 * in exactly one place:
 *
 *   node scripts/build/commit-types/index.mjs --lint-range <base> <head>
 */

import { execFileSync } from "node:child_process";

export const COMMIT_TYPES = ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"];

const SUBJECT = new RegExp(String.raw`^(${COMMIT_TYPES.join("|")})\([a-z0-9._-]+\): .+$`, "u");

function lintRange(base, head) {
  const commits = execFileSync("git", ["rev-list", `${base}..${head}`], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  const bad = [];

  for (const commit of commits) {
    const subject = execFileSync("git", ["log", "-1", "--format=%s", commit], { encoding: "utf8" }).trim();

    if (!SUBJECT.test(subject)) {
      bad.push(`${commit}: ${subject}`);
    }
  }

  if (bad.length > 0) {
    for (const line of bad) {
      process.stderr.write(`commit-lint: ${line}\n`);
    }

    process.exitCode = 1;

    return;
  }

  process.stdout.write(`commit-lint: ${commits.length} commit(s) follow type(scope).\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [flag, base, head] = process.argv.slice(2);

  if (flag === "--lint-range" && base && head) {
    lintRange(base, head);
  } else {
    process.stderr.write("usage: commit-types/index.mjs --lint-range <base> <head>\n");
    process.exitCode = 1;
  }
}
