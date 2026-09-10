

/**
 * @module test/no-source-traces.test
 *
 * Sources are read outside this repository and never enter it. Only what was
 * learned from them does.
 *
 * A skill is ours, written in our words, and it stands on its own. A filename
 * in a commit message or a plan is a pointer to something a reader cannot open,
 * may not be entitled to open, and that says nothing about the code. It also
 * ages badly: the reading moves, the section stays.
 *
 * The exception is a license obligation. Where this repository redistributes
 * someone's work - vendored W3C criteria, a file format from an MIT project -
 * the attribution stays, because it is a condition of use. Those live in one
 * place, the README's third-party table, and are allowlisted here by domain.
 *
 * Untracked files are checked as well. A guard that only reads committed content
 * cannot see the draft that is about to be committed, and that is the file most
 * likely to break the rule.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

/** Shapes that mark reading material rather than a licensed dependency. */
const SOURCE_PATTERNS = [
  { name: "a reading-folder path", re: /articles[ _-]to[ _-]check/i },
  { name: "a Medium-style article URL", re: /https?:\/\/(?:\w+\.)?(?:medium\.com|plainenglish\.io|freedium)/i },
  { name: 'an "inspired by" credit', re: /^\s*(?:\*\*|\*|#+\s*)?inspired by\b/im },
];

/** Domains we redistribute from, and therefore must credit. */
const LICENSED = /w3\.org|github\.com\/AllThingsSmitty\/ai-flight-recorder|modelcontextprotocol/i;

// --others --exclude-standard so an untracked file is checked too. Without it
// the guard misses exactly the files most likely to break the rule: a draft that
// has not been committed yet. One did - an older plan sitting untracked in
// docs/plans/ named the reading folder and this test passed. Ignored paths stay
// out, which is the point: the reading folder is gitignored on purpose, and
// untracked-but-not-ignored is a file on its way into a commit.
const tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "*.md", "*.js", "*.mjs", "*.json"], { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean)
  .filter((file) => !file.startsWith("tests/no-source-traces"))
  // git lists a deleted-but-still-tracked file; reading it would throw.
  .filter((file) => existsSync(file));

test("no tracked file points at reading material", () => {
  const offenders = [];
  for (const file of tracked) {
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const { name, re } of SOURCE_PATTERNS) {
      const match = content.match(re);
      if (!match) {
        continue;
      }
      const line = content.slice(0, match.index).split("\n").length;
      if (LICENSED.test(content.split("\n")[line - 1] ?? "")) {
        continue;
      }
      offenders.push(`${file}:${line} contains ${name}`);
    }
  }
  assert.deepEqual(offenders, [], `Sources do not belong in this repository, only what was learned from them:\n  ${offenders.join("\n  ")}`);
});

test("commit messages on this branch name no sources", () => {
  let messages;
  try {
    messages = execFileSync("git", ["log", "--format=%B", "-n", "60"], { encoding: "utf8" });
  } catch {
    return; // no git history available, e.g. a packed tarball
  }
  const offenders = SOURCE_PATTERNS.filter(({ re }) => re.test(messages)).map(({ name }) => name);
  assert.deepEqual(offenders, [], `recent commit messages contain: ${offenders.join(", ")}`);
});
