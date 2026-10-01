

/**
 * @module core/self-update/_upgrade
 *
 * Move a git-clone install to the newest release: `git checkout main`,
 * `git pull -r`, then `scripts/reinstall.sh --keep-lock` (ADR 131).
 *
 * The lock is kept because the release pinned it: regenerating it would
 * resolve whatever the registry serves today and leave the checkout dirty.
 */

import { spawn } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";
import { join } from "node:path";

import { getRuntimePaths } from "../../cli/paths/index.js";
import { git } from "./_git.js";
import { RELEASE_BRANCH } from "./_release.js";

const PULL_TIMEOUT_MS = 120_000;
const REINSTALL_TIMEOUT_MS = 15 * 60_000;

/**
 * Run the reinstall with the lock kept, its output in `state/update.log`.
 *
 * @param {string} root
 * @returns {Promise<{ ok: boolean, log: string }>}
 */
export function runReinstall(root) {
  const { stateDir } = getRuntimePaths();
  const log = join(stateDir, "update.log");

  mkdirSync(stateDir, { recursive: true });

  const out = openSync(log, "a");

  return new Promise((resolve) => {
    const child = spawn("bash", [join(root, "scripts", "reinstall.sh"), "--keep-lock"], {
      cwd: root,
      stdio: ["ignore", out, out],
      timeout: REINSTALL_TIMEOUT_MS,
      killSignal: "SIGKILL",
    });

    child.on("error", () => resolve({ ok: false, log }));
    child.on("close", (code) => resolve({ ok: code === 0, log }));
  });
}

/**
 * Check out main, pull it with a rebase, and reinstall.
 *
 * @param {{ root: string, current: string, latest: { tag: string, version: string }, reinstall?: (root: string) => Promise<{ ok: boolean, log: string }> }} options
 * @returns {Promise<object>} the self-update result
 */
export async function applyUpgrade({ root, current, latest, reinstall = runReinstall }) {
  const before = await git(["rev-parse", "HEAD"], root);

  if ((await git(["checkout", "--quiet", RELEASE_BRANCH], root)) === null) {
    return { checked: true, updated: false, skipped: true, reason: "checkout-failed", release: latest.tag };
  }

  if ((await git(["pull", "--quiet", "--rebase"], root, PULL_TIMEOUT_MS)) === null) {
    return { checked: true, updated: false, skipped: true, reason: "pull-failed", release: latest.tag };
  }

  const after = await git(["rev-parse", "HEAD"], root);
  const changed = ((await git(["diff", "--name-only", before, after], root)) ?? "").split("\n").filter(Boolean);
  const installed = await reinstall(root);

  process.stderr.write(`[rule-mcp] upgraded ${current || "?"} -> ${latest.version} (${latest.tag})\n`);

  return {
    checked: true,
    updated: true,
    release: latest.tag,
    from: current,
    to: latest.version,
    count: changed.length,
    changedSkills: changed.some((path) => path.startsWith("skills/")),
    changedCode: true,
    reinstalled: installed.ok,
    log: installed.log,
  };
}
