

/**
 * @module core/git/base - which branch a feature was born from.
 *
 * Git knows the answer, so no model is asked for one. Sources, strongest
 * first:
 *
 *   1. an explicit `baseBranch` argument - a caller that already knows;
 *   2. `git config rule.baseBranch` - the repository stating it;
 *   3. `RULE_MCP_BASE_BRANCH` - a CI or shell stating it;
 *   4. `origin/HEAD` - the remote's own default branch;
 *   5. the conventional trunks, in the order develop, main, master.
 *
 * The conventional fallback prefers a local branch to its remote-tracking copy,
 * because a local trunk is what a rebase against it should use.
 */

import { branchExists, remoteBranchExists } from "./_repo.js";
import { git } from "./_run.js";

/** The repository config key an explicit base branch is read from. */
export const BASE_BRANCH_CONFIG_KEY = "rule.baseBranch";

/** The environment variable an explicit base branch is read from. */
export const BASE_BRANCH_ENV = "RULE_MCP_BASE_BRANCH";

/** The trunks tried last, in order. */
export const CONVENTIONAL_BASE_BRANCHES = ["develop", "main", "master"];

/**
 * @typedef {object} BaseBranch
 * @property {string} branch the branch name, or "" when none was found
 * @property {string} ref the ref that resolves it (may be "origin/<branch>")
 * @property {"argument"|"config"|"env"|"origin-head"|"convention"|"none"} source
 */

/**
 * The ref a branch name resolves to, preferring the local branch.
 *
 * @param {string} projectDir
 * @param {string} branch
 * @returns {string}
 */
function resolveRef(projectDir, branch) {
  if (branchExists(projectDir, branch)) {
    return branch;
  }

  if (remoteBranchExists(projectDir, branch)) {
    return `origin/${branch}`;
  }

  return branch;
}

/**
 * Strip a remote name from a remote-tracking ref: "origin/main" -> "main".
 *
 * @param {string} ref
 * @returns {string}
 */
function stripRemote(ref) {
  const slash = ref.indexOf("/");

  return slash === -1 ? ref : ref.slice(slash + 1);
}

/**
 * Determine the branch the current work is based on.
 *
 * @param {string} projectDir
 * @param {{ baseBranch?: string }} [options]
 * @returns {BaseBranch}
 */
export function detectBaseBranch(projectDir, options = {}) {
  const argument = options.baseBranch ?? "";

  if (argument) {
    return { branch: argument, ref: resolveRef(projectDir, argument), source: "argument" };
  }

  const configured = git(projectDir, ["config", "--get", BASE_BRANCH_CONFIG_KEY]);

  if (configured) {
    return { branch: configured, ref: resolveRef(projectDir, configured), source: "config" };
  }

  const fromEnvironment = process.env[BASE_BRANCH_ENV] ?? "";

  if (fromEnvironment) {
    return { branch: fromEnvironment, ref: resolveRef(projectDir, fromEnvironment), source: "env" };
  }

  const originHead = git(projectDir, ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]);

  if (originHead) {
    return { branch: stripRemote(originHead), ref: originHead, source: "origin-head" };
  }

  for (const candidate of CONVENTIONAL_BASE_BRANCHES) {
    if (branchExists(projectDir, candidate)) {
      return { branch: candidate, ref: candidate, source: "convention" };
    }

    if (remoteBranchExists(projectDir, candidate)) {
      return { branch: candidate, ref: `origin/${candidate}`, source: "convention" };
    }
  }

  return { branch: "", ref: "", source: "none" };
}
