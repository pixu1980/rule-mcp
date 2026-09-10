

/** @module scripts/build/changelog/history - the commits and tags, read from git */

import { execFileSync } from "node:child_process";

/**
 * Run a git command in a project directory.
 *
 * @param {string} projectDir
 * @param {string[]} args
 * @returns {string} stdout, trimmed
 */
export function git(projectDir, args) {
  return execFileSync("git", args, { cwd: projectDir, encoding: "utf8" }).trim();
}

/**
 * Every commit, newest first, with the tag that released it.
 *
 * @param {string} projectDir
 * @returns {Array<{ hash: string, subject: string, body: string, release: string|null }>}
 */
export function readHistory(projectDir) {
  const raw = git(projectDir, ["log", "--pretty=format:%H%x1f%s%x1f%D%x1f%b%x1e"]);
  if (raw === "") {
    return [];
  }

  const commits = [];
  let release = null;
  for (const record of raw.split("")) {
    const line = record.trim();
    if (line === "") {
      continue;
    }
    const [hash, subject, refs, body] = line.split("");

    // Refs are read newest-first, so a tag names the release that the commits
    // from here downward belong to.
    const tag = (refs ?? "").split(", ").find((reference) => reference.startsWith("tag: "));
    if (tag) {
      release = tag.slice("tag: ".length).replace(/^v/, "");
    }

    commits.push({ hash: hash.slice(0, 7), subject, body: body ?? "", release });
  }

  return commits;
}

/**
 * Turn a commit into an entry, or null when it is not one.
 *
 * @param {{ hash: string, subject: string, body: string }} commit
 * @returns {{ section: string, scope: string, subject: string, hash: string, breaking: boolean }|null}
 */
