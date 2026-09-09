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
import { globSync } from "node:fs";

import { SUITES } from "./_suites.data.mjs";

// The compiled code cache never changes behavior, but a suite that reads a
// cache another suite wrote is a suite whose result depends on run order.
process.env.NODE_DISABLE_COMPILE_CACHE = "1";

const name = process.argv[2];
const suite = SUITES[name];

if (!suite) {
  console.error(`Unknown suite "${name ?? ""}". Known: ${Object.keys(SUITES).join(", ")}`);
  process.exit(2);
}

/** Resolve a suite plus everything it includes, once each. */
function resolve(id, seen = new Set()) {
  if (seen.has(id)) {
    return { steps: [], globs: [], shell: [] };
  }
  seen.add(id);
  const entry = SUITES[id];
  const merged = { steps: [...(entry.steps ?? [])], globs: [...(entry.globs ?? [])], shell: [...(entry.shell ?? [])] };

  for (const child of entry.include ?? []) {
    const sub = resolve(child, seen);
    merged.steps.push(...sub.steps);
    merged.globs.push(...sub.globs);
    merged.shell.push(...sub.shell);
  }

  return merged;
}

const { steps, globs, shell } = resolve(name);

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
  run(process.execPath, [step]);
}

const files = [...new Set(globs.flatMap((pattern) => globSync(pattern)))].sort();

if (globs.length > 0 && files.length === 0) {
  console.error(`${name}: the globs matched no test files - a rename broke the suite`);
  process.exit(1);
}

if (files.length > 0) {
  console.log(`\n== node --test (${files.length} files) ==`);
  run(process.execPath, ["--test", ...files]);
}

for (const [command, ...args] of shell) {
  run(command, args);
}

console.log(`\n${name}: ok`);
