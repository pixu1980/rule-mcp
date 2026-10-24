#!/usr/bin/env node
/**
 * @module scripts/install/git-hooks
 *
 * Point `.git/hooks/` at the hooks this repository tracks in `.githooks/`.
 *
 * Nothing installed them, so a fresh clone ran no hook and a stale clone ran
 * its own copy. Each installed file is a shim that executes the tracked hook,
 * so there is one copy of the logic and drift has nowhere to happen.
 *
 * `core.hooksPath = .githooks` would be shorter and is deliberately not used:
 * git honors exactly one hooks path, so setting it per repository silences a
 * global one - which is where tokensave installs its auto-sync, and is what
 * chains into `.git/hooks/` to begin with.
 *
 * Run: `pnpm hooks:install` (also from `prepare`). `--check` reports without
 * writing and exits non-zero when a hook is missing or is not the shim.
 */

import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { isInsideGitDir } from "./_containment.mjs";
import { shim } from "./_shim.mjs";

const check = process.argv.includes("--check");

/** One place shells out; every question here is a `git rev-parse` read. */
function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

/** The clone the caller stands in, not the one this file lives in. */
function repoRoot() {
  try {
    return git("rev-parse", "--show-toplevel");
  } catch {
    return null;
  }
}

const ROOT = repoRoot();

if (!ROOT) {
  // No clone here: installed as a dependency, or unpacked from a tarball.
  // `prepare` must not fail the install.
  process.exit(check ? 1 : 0);
}

const TRACKED = join(ROOT, ".githooks");

/**
 * Where THIS CLONE keeps its hooks.
 *
 * `--git-path hooks` is the obvious call and the wrong one: it resolves
 * `core.hooksPath`, so on a machine with a global hooks directory it answers
 * with the user's, and installing there replaces hooks that belong to every
 * repository they own.
 *
 * @returns {string}
 */
function hooksDir() {
  const gitDir = git("rev-parse", "--git-dir");

  return join(gitDir.startsWith("/") ? gitDir : join(ROOT, gitDir), "hooks");
}

/** Refuse a target outside this clone, whatever git reported. */
function refuseOutside(target) {
  const gitDir = git("rev-parse", "--absolute-git-dir");

  if (!isInsideGitDir(gitDir, target)) {
    console.error(`git hooks: refusing to write to ${target}, which is outside ${gitDir}`);
    process.exit(2);
  }
}

if (!existsSync(TRACKED)) {
  console.log("git hooks: no .githooks directory here, nothing to install");
  process.exit(0);
}

const target = hooksDir();
refuseOutside(target);
const names = readdirSync(TRACKED).sort();
const installed = [];
const stale = [];
const backed = [];

if (!check) {
  mkdirSync(target, { recursive: true });
}

for (const name of names) {
  const path = join(target, name);
  const wanted = shim(name);
  const current = existsSync(path) ? readFileSync(path, "utf8") : null;

  if (current === wanted) {
    continue;
  }

  stale.push(name);

  if (check) {
    continue;
  }

  // A hook that is neither ours nor the tracked copy is someone's own work.
  if (current !== null && current !== readFileSync(join(TRACKED, name), "utf8")) {
    copyFileSync(path, `${path}.bak`);
    backed.push(name);
  }

  writeFileSync(path, wanted);
  chmodSync(path, 0o755);
  installed.push(name);
}

if (check) {
  console.log(stale.length === 0 ? `git hooks: ${names.length} installed and current` : `git hooks: not installed or stale: ${stale.join(", ")}`);
  process.exit(stale.length === 0 ? 0 : 1);
}

console.log(installed.length === 0 ? `git hooks: ${names.length} already current` : `git hooks: installed ${installed.join(", ")}`);

if (backed.length > 0) {
  console.log(`  kept a copy of the previous ${backed.join(", ")} beside it as <name>.bak`);
}
