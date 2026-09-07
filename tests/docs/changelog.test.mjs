/**
 * @module test/changelog.test
 *
 * The changelog is generated from the commits, so it cannot disagree with them.
 *
 * What is asserted here is the part a reader depends on: every conventional
 * commit reaches exactly one section, noise is dropped on purpose rather than
 * by accident, a release boundary follows the tags, and running the generator
 * twice on the same history produces the same bytes.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
};

console.log("changelog generator test");

const { buildChangelog, SECTION_FOR_TYPE } = await import("../../scripts/build/changelog/index.mjs");

const git = (root, ...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

/** A repository with two releases and some unreleased work on top. */
function scriptedRepository() {
  const root = mkdtempSync(join(tmpdir(), "rule-changelog-"));
  git(root, "init", "--initial-branch=main", "-q");
  git(root, "config", "user.email", "fixture@example.com");
  git(root, "config", "user.name", "Fixture");

  const commit = (message) => {
    writeFileSync(join(root, "file.txt"), `${message}\n`);
    git(root, "add", "-A");
    git(root, "commit", "-qm", message);
  };

  commit("feat(router): score with bm25");
  commit("fix(cache): drop a stale entry on read");
  git(root, "tag", "v1.0.0");

  commit("feat(cache): a shared catalog");
  commit("perf(gateway): cache the deterministic half");
  commit("docs(adr): record the catalog decision");
  commit("chore(deps): bump a dev dependency");
  commit("test(cache): pin the tiers");
  git(root, "tag", "v1.1.0");

  commit("fix(installer): back up before writing");
  commit("feat(guardrails)!: comments carry no history");

  return root;
}

const root = scriptedRepository();
const out = buildChangelog({ projectDir: root });

// ── Every kind of commit lands where a reader expects ──

check("T1 a feature is Added", /### Added\n[\s\S]*comments carry no history/.test(out));
check("T2 a fix is Fixed", /### Fixed\n[\s\S]*back up before writing/.test(out));
check("T3 the newest work is unreleased", out.indexOf("[Unreleased]") < out.indexOf("back up before writing"));

check("T4 a release gets its own heading", out.includes("## [1.1.0]") && out.includes("## [1.0.0]"));
check(
  "T5 a commit sits under the release that contains it",
  out.indexOf("a shared catalog") > out.indexOf("## [1.1.0]") && out.indexOf("a shared catalog") < out.indexOf("## [1.0.0]"),
);

check("T6 newest release first", out.indexOf("## [1.1.0]") < out.indexOf("## [1.0.0]"));

// ── Noise is dropped deliberately ──

check("T7 a chore is not an entry", !out.includes("bump a dev dependency"));
check("T8 a test commit is not an entry", !out.includes("pin the tiers"));
check("T8.1 and the file says so rather than leaving a reader wondering", /chore|test/i.test(out.split("## [", 1)[0]));

// ── The scope is what makes an entry readable ──

check("T9 the scope leads the entry", /- \*\*installer\*\*: back up before writing/.test(out));

// ── A breaking change is called out ──

check("T10 a breaking change is marked", /BREAKING|breaking/i.test(out));

// ── Deterministic ──

check("T11 two runs agree", buildChangelog({ projectDir: root }) === out);

// ── The mapping is explicit, not implied ──

check(
  "T12 every conventional type has a decision",
  ["feat", "fix", "perf", "refactor", "docs", "style", "test", "chore", "build", "ci", "revert"].every((type) => type in SECTION_FOR_TYPE),
);

// ── It survives a repository with no tags at all ──

const bare = mkdtempSync(join(tmpdir(), "rule-changelog-bare-"));
git(bare, "init", "--initial-branch=main", "-q");
git(bare, "config", "user.email", "f@example.com");
git(bare, "config", "user.name", "F");
writeFileSync(join(bare, "a.txt"), "a\n");
git(bare, "add", "-A");
git(bare, "commit", "-qm", "feat(core): the first thing");
const untagged = buildChangelog({ projectDir: bare });
check("T13 with no tags everything is unreleased", untagged.includes("[Unreleased]") && untagged.includes("the first thing"));
check("T13.1 and no empty release heading is emitted", !/## \[\]/.test(untagged));

// ── The committed file is generated, not written ──

const { readFileSync } = await import("node:fs");
const committed = readFileSync(new URL("../../CHANGELOG.md", import.meta.url), "utf8");
const generatedHeader = buildChangelog({ projectDir: new URL("../..", import.meta.url).pathname }).split("## [", 1)[0];

check("T14 the committed changelog carries the generated header", committed.startsWith("# Changelog") && committed.split("## [", 1)[0] === generatedHeader);
check(
  "T15 and nothing has been hand-written into it",
  // Every entry line is `- **scope**: subject (`hash`)`. Prose that is not an
  // entry means somebody edited the file instead of the commits. The exact
  // contents are not asserted: the unreleased section moves with every commit,
  // so equality would fail on the commit that follows any regeneration.
  committed
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .every((line) => /^- (\*\*BREAKING\*\* )?\*\*[a-z0-9._-]+\*\*: .+ \(`[0-9a-f]{7}`\)$/.test(line)),
);

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
