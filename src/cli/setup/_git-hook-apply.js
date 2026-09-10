

/**
 * @module cli/setup/git-hook-apply
 *
 * Locating the post-commit hook and writing the managed block into it.
 */

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { tryExec } from "../../shared/index.js";
import { hasHook, withHook, withoutHook } from "./_git-hook.js";

/**
 * The post-commit hook of the repository `cwd` sits in, or "" when there is
 * no repository. `core.hooksPath` is honored: a repo that redirects its
 * hooks (this one does, to .githooks) must not get a second copy in .git.
 */
export function postCommitPath(cwd = process.cwd()) {
  const gitDir = tryExec("git rev-parse --git-dir", { cwd }).trim();

  if (!gitDir) {
    return "";
  }

  const configured = tryExec("git config --get core.hooksPath", { cwd }).trim();
  // Both values may already be absolute; resolve() keeps them so and makes
  // the relative form (".git", ".githooks") relative to the repo, not to the
  // process working directory.
  const hooksDir = configured ? resolve(cwd, configured) : resolve(cwd, gitDir, "hooks");

  return join(hooksDir, "post-commit");
}

/**
 * Add the managed block to the post-commit hook.
 *
 * @param {{ cwd?: string, dryRun?: boolean }} [options]
 * @returns {{ status: "written"|"present"|"planned"|"no-repo", file?: string }}
 */
export function installGitHook({ cwd = process.cwd(), dryRun = false } = {}) {
  const file = postCommitPath(cwd);

  if (!file) {
    return { status: "no-repo" };
  }

  const current = existsSync(file) ? readFileSync(file, "utf8") : "";

  if (hasHook(current)) {
    return { status: "present", file };
  }

  if (dryRun) {
    return { status: "planned", file };
  }

  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, withHook(current));
  chmodSync(file, 0o755);

  return { status: "written", file };
}

/**
 * Remove the managed block from the post-commit hook, keeping a backup of
 * whatever was there first.
 *
 * @param {{ cwd?: string, dryRun?: boolean }} [options]
 * @returns {{ status: "removed"|"absent"|"planned"|"no-repo", file?: string }}
 */
export function removeGitHook({ cwd = process.cwd(), dryRun = false } = {}) {
  const file = postCommitPath(cwd);

  if (!file || !existsSync(file)) {
    return { status: file ? "absent" : "no-repo", file: file || undefined };
  }

  const current = readFileSync(file, "utf8");

  if (!hasHook(current)) {
    return { status: "absent", file };
  }

  if (dryRun) {
    return { status: "planned", file };
  }

  writeFileSync(`${file}.bak`, current);
  writeFileSync(file, withoutHook(current));
  chmodSync(file, 0o755);

  return { status: "removed", file };
}
