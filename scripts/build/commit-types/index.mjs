#!/usr/bin/env node



/**
 * @module scripts/build/commit-types
 *
 * The single source of truth for commit types (OSS-19).
 *
 * The commit-msg hook, the semantic.yml PR-title check, and the commit-lint
 * CI job all accept this exact type list, so the pattern lives in exactly
 * one place:
 *
 *   node scripts/build/commit-types/index.mjs --lint-range <base> <head>
 */

import { execFileSync } from "node:child_process";
/** The one accepted type list for every commit gate (OSS-19). */
export const COMMIT_TYPES = ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"];

/**
 * System-generated subjects, which cannot carry a scope: GitHub's merge ref
 * ("Merge <sha> into <sha>"), PR merges ("Merge pull request #N from ..."),
 * and web reverts ("Revert \"...\""). The commit-msg hook exempts the same
 * two prefixes, and tests/docs/commit-gates.test.mjs pins the parity.
 */
export const SYSTEM_MESSAGE_PREFIXES = ["Merge", "Revert"];
export const SYSTEM_SUBJECT = new RegExp(`^(?:${SYSTEM_MESSAGE_PREFIXES.join("|")}) `, "u");

export function isSystemSubject(subject) {
  return SYSTEM_SUBJECT.test(subject);
}

const SUBJECT = new RegExp(String.raw`^(${COMMIT_TYPES.join("|")})\([a-z0-9._-]+\): .+$`, "u");

function lintRange(base, head) {
  const commits = execFileSync("git", ["rev-list", `${base}..${head}`], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  const bad = [];
  let linted = 0;

  for (const commit of commits) {
    const subject = execFileSync("git", ["log", "-1", "--format=%s", commit], { encoding: "utf8" }).trim();

    if (isSystemSubject(subject)) {
      continue;
    }

    linted += 1;

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

  process.stdout.write(`commit-lint: ${linted} commit(s) follow type(scope).\n`);
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
