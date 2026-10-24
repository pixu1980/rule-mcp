#!/usr/bin/env node
/**
 * Glob-based test runner: `node scripts/ci/run-tests/index.mjs <suite>`.
 *
 * Replaces the hardcoded file lists that used to live in package.json and
 * .github/workflows/ci.yml. Suite membership is defined once, by glob, in
 * ./_suites.data.mjs; a test file added under a covered directory is picked up
 * with no runner edit.
 */
import { spawnSync } from "node:child_process";

import { expandSuite, resolveSuite } from "./_expand.mjs";
import { SUITES } from "./_suites.data.mjs";

// Server code resolves `@src/*` through a hook (ADR 089). Every process this
// runner spawns loads server code, so every one of them registers it. The
// `file://` URL is required: a bare `D:\...` path is rejected by `--import` on
// Windows.
const ALIAS_HOOK = ["--import", new URL("../../alias-hook.mjs", import.meta.url).href];

// The compiled code cache never changes behavior, but a suite that reads a
// cache another suite wrote is a suite whose result depends on run order.
process.env.NODE_DISABLE_COMPILE_CACHE = "1";

// The branch-sync guard reads the local checkout, so a suite must not depend on
// how far the base branch moved. Tests that exercise the guard enable it.
process.env.RULE_MCP_NO_SYNC_GUARD = "1";

const name = process.argv[2];
const suite = SUITES[name];

if (!suite) {
  console.error(`Unknown suite "${name ?? ""}". Known: ${Object.keys(SUITES).join(", ")}`);
  process.exit(2);
}

const { steps, globs, shell } = resolveSuite(name);
const { files, absent } = expandSuite(name);

if (absent.length > 0) {
  console.error(`${name}: ${absent.join(", ")} is excluded by name but does not exist - a rename left the exclusion behind`);
  process.exit(1);
}

/** Run one command inheriting stdio; a failure ends the suite immediately. */
function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });

  if (result.status !== 0) {
    console.error(`\n${name}: ${command} ${args.join(" ")} failed (exit ${result.status})`);
    process.exit(result.status ?? 1);
  }
}

for (const step of new Set(steps)) {
  console.log(`\n== ${step} ==`);
  run(process.execPath, [...ALIAS_HOOK, step]);
}

if (globs.length > 0 && files.length === 0) {
  console.error(`${name}: the globs matched no test files - a rename broke the suite`);
  process.exit(1);
}

if (files.length > 0) {
  console.log(`\n== node --test (${files.length} files) ==`);
  run(process.execPath, [...ALIAS_HOOK, "--test", ...files]);
}

for (const [command, ...args] of shell) {
  run(command, args);
}

console.log(`\n${name}: ok`);
