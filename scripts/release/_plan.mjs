

/**
 * @module scripts/release/_plan
 *
 * What a release would be, read from the repository and written nowhere.
 *
 * Every refusal is collected rather than the first one winning, so a person
 * sees everything that stands between them and the release in one run.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { deriveNextVersion } from "../build/version/_derive.mjs";

/** The branch a release is cut from. */
export const RELEASE_BRANCH = "main";

/** The remote a release is pushed to. */
export const RELEASE_REMOTE = "origin";

/**
 * Run git in a directory and return its trimmed output; a failure throws.
 *
 * @param {string} cwd
 * @param {string[]} arguments_
 * @returns {string}
 */
export const git = (cwd, arguments_) =>
  execFileSync("git", arguments_, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/** Whether a ref resolves, without throwing when it does not. */
const exists = (cwd, reference) => {
  try {
    git(cwd, ["rev-parse", "--quiet", "--verify", reference]);

    return true;
  } catch {
    return false;
  }
};

/** The version the manifest claims. */
function manifestVersion(cwd) {
  try {
    return JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")).version;
  } catch {
    return "0.0.0";
  }
}

/**
 * Read the release this repository would cut now.
 *
 * @param {{ cwd?: string, fetch?: boolean }} [options]
 * @returns {Promise<{ refusals: string[], branch: string, current: string, next: string, bump: string, tag: string, ahead: number, behind: number, commits: number }>}
 */
export async function planRelease({ cwd = process.cwd(), fetch = true } = {}) {
  const refusals = [];

  if (fetch) {
    git(cwd, ["fetch", "--quiet", "--tags", "--prune", RELEASE_REMOTE]);
  }

  const branch = git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);

  if (branch !== RELEASE_BRANCH) {
    refusals.push(`a release is cut from ${RELEASE_BRANCH}, and this is ${branch}`);
  }

  if (git(cwd, ["status", "--porcelain", "--untracked-files=no"]) !== "") {
    refusals.push("the working tree has uncommitted changes");
  }

  const upstream = `${RELEASE_REMOTE}/${RELEASE_BRANCH}`;
  let ahead = 0;
  let behind = 0;

  if (exists(cwd, upstream)) {
    [behind, ahead] = git(cwd, ["rev-list", "--left-right", "--count", `${upstream}...HEAD`])
      .split(/\s+/)
      .map(Number);

    if (behind > 0) {
      refusals.push(`${RELEASE_BRANCH} is ${behind} commit(s) behind ${upstream}: pull first`);
    }
  } else {
    refusals.push(`${upstream} does not exist: nothing to push the release to`);
  }

  const current = manifestVersion(cwd);
  const answer = deriveNextVersion(cwd, current);
  const next = answer.bump === "none" ? "" : answer.version;
  const tag = next ? `v${next}` : "";

  if (!next) {
    refusals.push(`nothing to release since the newest tag: no feat, fix or breaking change`);
  } else if (exists(cwd, `refs/tags/${tag}`)) {
    refusals.push(`the tag ${tag} already exists`);
  }

  return {
    refusals,
    branch,
    current,
    next,
    bump: answer.bump,
    tag,
    ahead,
    behind,
    commits: answer.commits,
  };
}
