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

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stripFingerprint } from "../../../src/core/fingerprint.js";

/**
 * Which Keep a Changelog section each conventional type belongs to.
 *
 * `null` means the type is deliberately not an entry: a reader installing this
 * package gains nothing from a dependency bump or a test being added, and a
 * changelog that lists everything is one nobody reads.
 */
export const SECTION_FOR_TYPE = {
  feat: "Added",
  fix: "Fixed",
  perf: "Changed",
  refactor: "Changed",
  docs: "Documentation",
  revert: "Removed",
  style: null,
  test: null,
  chore: null,
  build: null,
  ci: null,
};

/** The order sections appear in, when present. */
const SECTION_ORDER = ["Added", "Changed", "Fixed", "Removed", "Documentation"];

const SUBJECT = /^(?<type>[a-z]+)\((?<scope>[a-z0-9._-]+)\)(?<breaking>!)?: (?<subject>.+)$/;

/**
 * Run a git command in a project directory.
 *
 * @param {string} projectDir
 * @param {string[]} args
 * @returns {string} stdout, trimmed
 */
function git(projectDir, args) {
  return execFileSync("git", args, { cwd: projectDir, encoding: "utf8" }).trim();
}

/**
 * Every commit, newest first, with the tag that released it.
 *
 * @param {string} projectDir
 * @returns {Array<{ hash: string, subject: string, body: string, release: string|null }>}
 */
function readHistory(projectDir) {
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
function toEntry(commit) {
  const match = SUBJECT.exec(commit.subject);
  if (!match) {
    return null;
  }

  const { type, scope, subject, breaking } = match.groups;
  const isBreaking = Boolean(breaking) || /^BREAKING CHANGE:/m.test(commit.body);
  // A breaking feature is still an addition, so the type keeps its section and
  // the entry carries the mark. A breaking change to a type that is normally
  // noise is the exception: it surfaces under Changed rather than disappearing.
  const section = SECTION_FOR_TYPE[type] ?? (isBreaking ? "Changed" : null);
  if (!section) {
    return null;
  }

  // Older subjects carry typographic characters and British spellings that the
  // house style rejects. The commit is immutable; the rendered entry is not, so
  // it is cleaned here with the same pass every tool result goes through.
  return { section, scope, subject: stripFingerprint(subject), hash: commit.hash, breaking: isBreaking };
}

/** Render one release's entries, grouped by section. */
function renderRelease(heading, entries) {
  const bySection = new Map();
  for (const entry of entries) {
    if (!bySection.has(entry.section)) {
      bySection.set(entry.section, []);
    }
    bySection.get(entry.section).push(entry);
  }
  if (bySection.size === 0) {
    return "";
  }

  const lines = [`## ${heading}`, ""];
  for (const section of SECTION_ORDER) {
    const rows = bySection.get(section);
    if (!rows || rows.length === 0) {
      continue;
    }
    lines.push(`### ${section}`, "");
    for (const row of rows) {
      const mark = row.breaking ? "**BREAKING** " : "";
      lines.push(`- ${mark}**${row.scope}**: ${row.subject} (\`${row.hash}\`)`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Build the whole file.
 *
 * @param {{ projectDir?: string }} [options]
 * @returns {string} the file contents, ending in a newline
 */
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

  const header = [
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

  const sections = [];
  for (const [release, entries] of releases) {
    const heading = release === "" ? "[Unreleased]" : `[${release}]`;
    const rendered = renderRelease(heading, entries);
    if (rendered !== "") {
      sections.push(rendered);
    }
  }

  return `${header}\n${sections.join("\n")}`.replace(/\n{3,}/g, "\n\n").replace(/\n*$/, "\n");
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
