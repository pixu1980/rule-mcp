#!/usr/bin/env node

/**
 * @module scripts/build-changelog
 *
 * Generate `CHANGELOG.md` from the commits.
 *
 * The commit-msg hook already requires `type(scope): subject` on every commit,
 * so the history holds everything a changelog needs. Deriving the file from it
 * means the two cannot disagree, and it removes the copy somebody has to keep
 * writing by hand beside the one git already keeps.
 *
 * Releases come from tags. Anything after the newest tag is unreleased.
 *
 * @see .github/workflows/release.yml - regenerates it when a version is tagged
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { git, readHistory } from "./_history.mjs";
import { renderRelease, toEntry } from "./_render.mjs";

export { SECTION_FOR_TYPE } from "./_sections.mjs";

/**
 * The static preamble every generated changelog starts with.
 *
 * Exported so the test that pins the committed file to the generated header
 * compares against the header itself, not against a whole generated document:
 * a shallow clone, which is what a checkout gives CI, sees a truncated
 * history and therefore no entries - and no entries meant no `## [` for the
 * old comparison to split on, so a correct file failed.
 */
export const CHANGELOG_PREAMBLE = [
  "# Changelog",
  "",
  "Generated from the commits by `scripts/build-changelog.mjs`. Run",
  "`pnpm changelog` to refresh it; the release workflow regenerates it when a",
  "version is tagged. Edits made here are overwritten.",
  "",
  "Every commit is `type(scope): subject`. Features, fixes, performance and",
  "refactoring work and documentation become entries; `chore`, `ci`, `build`,",
  "`test` and `style` commits do not, because a changelog that lists a",
  "dependency bump is one nobody reads. All of them are in `git log`.",
  "",
  "The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)",
  "and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).",
  "",
].join("\n");

export function buildChangelog({ projectDir = process.cwd() } = {}) {
  const commits = readHistory(projectDir);

  const releases = new Map();
  for (const commit of commits) {
    const entry = toEntry(commit);
    if (!entry) {
      continue;
    }
    const key = commit.release ?? "";
    if (!releases.has(key)) {
      releases.set(key, []);
    }
    releases.get(key).push(entry);
  }

  const sections = [];
  for (const [release, entries] of releases) {
    const heading = release === "" ? "[Unreleased]" : `[${release}]`;
    const rendered = renderRelease(heading, entries);
    if (rendered !== "") {
      sections.push(rendered);
    }
  }

  return `${CHANGELOG_PREAMBLE}\n${sections.join("\n")}`.replace(/\n{3,}/g, "\n\n").replace(/\n*$/, "\n");
}

/**
 * Write the file when it would change.
 *
 * @param {{ projectDir?: string }} [options]
 * @returns {boolean} whether anything was written
 */
export function writeChangelog({ projectDir = process.cwd() } = {}) {
  const file = join(projectDir, "CHANGELOG.md");
  const next = buildChangelog({ projectDir });
  let current = "";
  try {
    current = readFileSync(file, "utf8");
  } catch {
    // No file yet, so anything is a change.
  }
  if (current === next) {
    return false;
  }
  writeFileSync(file, next);

  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const changed = writeChangelog();
  console.log(changed ? "CHANGELOG.md updated" : "CHANGELOG.md already current");
}
