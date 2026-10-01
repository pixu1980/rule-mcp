

/**
 * @module scripts/release/_apply
 *
 * Cut the release a plan described: version, regenerated documents,
 * changelog, the checks, one commit, one annotated tag, one atomic push.
 *
 * The push is atomic so the branch and the tag land together or not at all.
 */

import { spawnSync } from "node:child_process";

import { writeChangelog } from "../build/changelog/index.mjs";
import { apply as stampVersion } from "../build/version/_commands.mjs";
import { RELEASE_BRANCH, RELEASE_REMOTE, git } from "./_plan.mjs";

/** Run a command in the checkout with its output shown, and throw when it fails. */
function run(cwd, command, arguments_) {
  const result = spawnSync(command, arguments_, { cwd, stdio: "inherit" });

  if (result.error || result.status !== 0) {
    throw new Error(`\`${command} ${arguments_.join(" ")}\` failed: the release stopped before committing`);
  }
}

/** The census regenerates every document the registries own. */
const regenerateDocs = async (cwd) => run(cwd, process.execPath, ["--import", "./scripts/alias-hook.mjs", "scripts/reports/census/index.mjs"]);

/** The same gate CI applies. */
const runChecks = async (cwd) => run(cwd, process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["run", "ci"]);

/**
 * Apply a plan. A plan carrying a refusal is never applied.
 *
 * @param {Awaited<ReturnType<import("./_plan.mjs").planRelease>>} plan
 * @param {{ cwd?: string, regenerate?: (cwd: string) => Promise<unknown>, check?: (cwd: string) => Promise<unknown>, push?: boolean }} [options]
 * @returns {Promise<{ tag: string, commit: string, pushed: boolean }>}
 */
export async function applyRelease(plan, options = {}) {
  const { cwd = process.cwd(), regenerate = regenerateDocs, check = runChecks, push = true } = options;

  if (plan.refusals.length > 0) {
    throw new Error(`release refused: ${plan.refusals.join("; ")}`);
  }

  // stampVersion writes package.json, server.json and a CHANGELOG heading from
  // the repository root it was loaded from; release always runs there.
  stampVersion(plan.next);
  await regenerate(cwd);
  writeChangelog({ projectDir: cwd, unreleased: plan.next });
  await check(cwd);

  git(cwd, ["add", "--update"]);
  git(cwd, ["add", "CHANGELOG.md"]);
  git(cwd, ["commit", "--quiet", "-s", "-m", `chore(release): ${plan.tag}`]);
  git(cwd, ["tag", "--annotate", plan.tag, "-m", plan.tag]);

  if (push) {
    git(cwd, ["push", "--quiet", "--atomic", RELEASE_REMOTE, RELEASE_BRANCH, plan.tag]);
  }

  return { tag: plan.tag, commit: git(cwd, ["rev-parse", "HEAD"]), pushed: push };
}
