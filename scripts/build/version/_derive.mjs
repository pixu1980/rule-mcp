

/**
 * @module scripts/build/version/derive
 *
 * The next version, derived from the commits since the newest tag.
 *
 * Semantic Versioning is a function of the commit types, so choosing the
 * number by hand is a chance to choose it wrong:
 *
 *   fix                     -> PATCH
 *   feat                    -> MINOR
 *   `!` or BREAKING CHANGE  -> MAJOR
 *   anything else           -> no bump
 *
 * The commits come from git; the rule comes from `src/core/commit`, the same
 * one the hooks and CI enforce, so a subject the gate accepted is bumpable and
 * one it rejected is not.
 */

import { parseCommitMessage } from "../../../src/core/commit/_rule.js";
import { readHistory } from "../changelog/_history.mjs";

/** The severity order of a bump. */
export const BUMPS = { none: 0, patch: 1, minor: 2, major: 3 };

/** The long-form breaking-change footer. */
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:/mu;

/**
 * Which bump one commit calls for.
 *
 * @param {{ subject: string, body?: string }} commit
 * @returns {"major"|"minor"|"patch"|"none"}
 */
export function bumpForCommit(commit) {
  const parsed = parseCommitMessage(commit.subject ?? "");

  if (!parsed.valid) {
    return "none";
  }

  if (parsed.breaking || BREAKING_FOOTER.test(commit.body ?? "")) {
    return "major";
  }

  if (parsed.type === "feat") {
    return "minor";
  }

  return parsed.type === "fix" ? "patch" : "none";
}

/**
 * The strongest bump a set of commits calls for, with the commits that decided it.
 *
 * @param {Array<{ hash: string, subject: string, body?: string }>} commits
 * @returns {{ bump: "major"|"minor"|"patch"|"none", reasons: string[] }}
 */
export function deriveBump(commits) {
  let bump = "none";
  const reasons = [];

  for (const commit of commits) {
    const kind = bumpForCommit(commit);

    if (BUMPS[kind] > BUMPS[bump]) {
      bump = kind;
    }

    if (kind !== "none") {
      reasons.push(`${commit.hash} ${kind}: ${commit.subject}`);
    }
  }

  return { bump, reasons };
}

/**
 * Apply a bump to a version, dropping any prerelease suffix.
 *
 * @param {string} current
 * @param {"major"|"minor"|"patch"|"none"} bump
 * @returns {string}
 */
export function nextVersion(current, bump) {
  if (bump === "none") {
    return current;
  }

  const match = /^(\d+)\.(\d+)\.(\d+)/u.exec(current ?? "");

  if (!match) {
    return current;
  }

  const [major, minor, patch] = match.slice(1).map(Number);

  if (bump === "major") {
    return `${major + 1}.0.0`;
  }

  return bump === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
}

/**
 * The commits made since the newest tag (all of them when no tag exists).
 *
 * @param {string} projectDir
 * @returns {Array<{ hash: string, subject: string, body: string }>}
 */
export function unreleasedCommits(projectDir) {
  return readHistory(projectDir).filter((commit) => commit.release === null);
}

/**
 * Derive the next version from the commits since the newest tag.
 *
 * @param {string} projectDir
 * @param {string} current - the version to bump, prerelease suffix and all
 * @returns {{ current: string, bump: string, version: string, commits: number, reasons: string[] }}
 */
export function deriveNextVersion(projectDir, current) {
  const commits = unreleasedCommits(projectDir);
  const { bump, reasons } = deriveBump(commits);

  return { current, bump, version: nextVersion(current, bump), commits: commits.length, reasons };
}
