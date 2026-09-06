/**
 * @module test/handon
 *
 * `pix_process_handon`: read the last handoff, verify what is still true.
 *
 * The fixtures are the substance here. A handon is only worth having if its
 * verification is right, so the scripted repository deliberately invalidates
 * every kind of claim a handoff makes: the branch got merged, one file was
 * deleted, another was modified, and the ADR that was pending landed. Each has
 * to be reported as what it is now, not as what the handoff said.
 *
 * @see ADR 052 - why this verifies rather than summarizes
 */

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
// Every scripted repository is a project, and a project gets a recording under
// the home directory. homedir() reads HOME, so this keeps them in a temp one.
process.env.HOME = mkdtempSync(join(tmpdir(), "rule-handon-home-"));

const { handon } = await import("../../src/tools/handon/index.js");

const git = (cwd, ...arguments_) =>
  execFileSync("git", arguments_, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const write = (root, relativePath, body) => {
  mkdirSync(join(root, relativePath, ".."), { recursive: true });
  writeFileSync(join(root, relativePath), body);
};

/** Every file in the tree, with size and mtime, for the no-write assertion. */
function snapshot(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else {
        const stats = statSync(path);
        out.push(`${relative(root, path)}:${stats.size}:${stats.mtimeMs}`);
      }
    }
  };
  walk(root);

  return out.sort().join("\n");
}

/**
 * A repository where the last handoff has gone stale in four different ways.
 *
 * @returns {{ root: string, base: string, handoff: string }}
 */
function scriptedRepository() {
  const root = mkdtempSync(join(tmpdir(), "rule-handon-"));
  git(root, "init", "--initial-branch=main", "-q");
  git(root, "config", "user.email", "fixture@example.com");
  git(root, "config", "user.name", "Fixture");

  write(root, "src/keep.js", "export const keep = 1;\n");
  write(root, "src/gone.js", "export const gone = 1;\n");
  write(root, "src/touched.js", "export const touched = 1;\n");
  write(
    root,
    "docs/adr/041-a-pending-decision.md",
    "# 041: A pending decision\n\n- **Date**: 2026-08-01\n- **Status**: proposed\n- **Tags**: fixture\n",
  );
  git(root, "add", "-A");
  git(root, "commit", "-qm", "chore(fixture): initial");
  const base = git(root, "rev-parse", "HEAD");

  // A branch that gets merged, so the handoff's "work is on this branch" is stale.
  git(root, "checkout", "-qb", "feat/merged");
  write(root, "src/merged.js", "export const merged = 1;\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "feat(fixture): work on the branch");
  git(root, "checkout", "-q", "main");
  git(root, "merge", "-q", "--no-ff", "-m", "chore(fixture): merge", "feat/merged");

  // One file deleted, one modified, one left alone.
  rmSync(join(root, "src/gone.js"));
  write(root, "src/touched.js", "export const touched = 2;\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "refactor(fixture): move on");

  // The pending ADR landed.
  write(
    root,
    "docs/adr/041-a-pending-decision.md",
    "# 041: A pending decision\n\n- **Date**: 2026-08-01\n- **Status**: accepted\n- **Tags**: fixture\n",
  );
  git(root, "add", "-A");
  git(root, "commit", "-qm", "docs(adr): accept 041");

  const handoff = "docs/handoff/07-fixture-session.md";
  write(
    root,
    handoff,
    [
      "# Handoff 07: the fixture session",
      "",
      `**Branch:** \`feat/merged\` - **Range:** \`${base.slice(0, 7)}..HEAD\` - **Date:** 2026-08-01`,
      "",
      "Work in flight touches `src/keep.js`, `src/gone.js` and `src/touched.js`.",
      "ADR 041 is still proposed and has to be accepted before this ships.",
      "A second branch, `feat/never-existed`, holds the spike.",
      "",
      "## Verification",
      "",
      "`pnpm run ci` was green when this was written.",
      "",
      "## What changed",
      "",
      "| Capability | Where |",
      "|---|---|",
      "| A normalized cache key | `src/keep.js` |",
      "| The tier field on every recorded call | `src/touched.js` |",
      "",
      "The narrative a handoff carries is most of its length: what was tried, what",
      "was rejected, and the reasoning that will not be obvious from the diff. That",
      "is exactly the part a resuming reader has already lived through, and exactly",
      "the part that has no business being pasted into a fresh session.",
      "",
      "## Invariants not to break",
      "",
      "1. The cached value is the deterministic core; decoration happens after it.",
      "2. Prompt text never reaches disk. Length and routed skill only.",
      "3. Measured savings and estimates are never summed.",
      "",
      "## Open",
      "",
      "- [ ] wire the normalized key into cacheKey()",
      "- [ ] add the tier field to telemetry",
      "- [x] delete the plan",
      "",
    ].join("\n"),
  );
  git(root, "add", "-A");
  git(root, "commit", "-qm", "chore(handoff): add session handoff 07");

  return { root, base, handoff };
}

const fixture = scriptedRepository();
const report = handon({ projectDir: fixture.root });

test("a numbered Next section is read as the open items", () => {
  // Every handoff this repository has written puts its open work under a
  // "Next, in order of leverage" heading as an ordered list. Only unchecked
  // checkboxes were parsed, so a resumed session was told there was nothing to
  // do while the handoff listed five prioritized items.
  const root = mkdtempSync(join(tmpdir(), "rule-handon-next-"));
  mkdirSync(join(root, "docs", "handoff"), { recursive: true });
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  git(root, "init", "-q");
  git(root, "config", "user.email", "fixture@example.com");
  git(root, "config", "user.name", "Fixture");
  write(root, "src/thing.js", "export const thing = 1;\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "feat(thing): the fixture");

  write(
    root,
    "docs/handoff/01-fixture.md",
    [
      "# Handoff 01: the fixture",
      "",
      "- **Branch**: `main`",
      "- **Date**: 2026-09-04",
      "",
      "## Next, in order of leverage",
      "",
      "1. **Decide what `saved.cache` means**: a hit replays tokens the model",
      "   still reads, so what it saves is recomputation.",
      "2. Label the remaining guardrail rules.",
      "3. Routing evals for the persona phrasings.",
      "",
      "## Conventions",
      "",
      "Conventional commits with a mandatory scope.",
      "",
    ].join("\n"),
  );
  git(root, "add", "-A");
  git(root, "commit", "-qm", "docs(handoff): add the fixture handoff");

  const report = handon({ projectDir: root });
  const { text } = report;

  assert.doesNotMatch(text, /listed no open items/, "the Next section is the open items");
  assert.match(text, /saved\.cache/, "the first item is carried over verbatim enough to act on");
  assert.match(
    text,
    /what it saves is recomputation/,
    "an item that wrapped in the handoff arrives whole, not cut at the column",
  );
  assert.match(text, /Label the remaining guardrail rules/, "and so are the rest");
  assert.doesNotMatch(text, /Conventional commits/, "the section after Next is not part of it");
  assert.equal(
    report.claims.filter((claim) => claim.kind === "open").length,
    3,
    "each item is a claim of its own, so every surface sees them",
  );
});

test("it finds the newest handoff and names it", () => {
  assert.equal(report.source, fixture.handoff);
  assert.ok(report.text.includes("07-fixture-session.md"), "the report names its source");
});

test("a merged branch is reported as merged, not as current", () => {
  const branch = report.claims.find((claim) => claim.kind === "branch" && claim.value === "feat/merged");
  assert.ok(branch, "the branch claim was parsed");
  assert.equal(branch.verdict, "merged into main");
});

test("a branch that never existed is gone, not an error", () => {
  const branch = report.claims.find((claim) => claim.value === "feat/never-existed");
  assert.ok(branch, "the second branch was parsed");
  assert.equal(branch.verdict, "gone");
});

test("a range that ends at HEAD says the number counts the range too", () => {
  // The fixture handoff writes `<sha>..HEAD`, and where HEAD pointed when it
  // was written is not recorded anywhere. Counting from the start is the only
  // thing possible, so the verdict says that is what it counted: reported as
  // "commits since" it read as work that landed after the handoff, and it was
  // the size of the handoff's own range plus that work.
  const range = report.claims.find((claim) => claim.kind === "range");
  assert.ok(range, "the range was parsed");
  assert.match(range.verdict, /^\d+ commits in and since the range/);
  assert.match(range.verdict, /HEAD/, "and why: the range has no fixed end");
  assert.ok(Number.parseInt(range.verdict, 10) >= 3, `expected at least 3 commits, got ${range.verdict}`);
});

test("a range with a fixed end counts only what landed after it", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-handon-fixed-"));
  mkdirSync(join(root, "docs", "handoff"), { recursive: true });
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  git(root, "init", "-q");
  git(root, "config", "user.email", "fixture@example.com");
  git(root, "config", "user.name", "Fixture");
  write(root, "src/one.js", "export const one = 1;\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "feat(one): the first");
  const start = git(root, "rev-parse", "HEAD");
  write(root, "src/two.js", "export const two = 2;\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "feat(two): inside the range");
  const end = git(root, "rev-parse", "HEAD");

  write(
    root,
    "docs/handoff/01-fixed.md",
    [
      "# Handoff 01: a range with both ends",
      "",
      "- **Branch**: `main`",
      `- **Covers**: \`${start.slice(0, 7)}..${end.slice(0, 7)}\``,
      "- **Date**: 2026-09-04",
      "",
      "## Next, in order of leverage",
      "",
      "1. Nothing yet.",
      "",
    ].join("\n"),
  );
  git(root, "add", "-A");
  git(root, "commit", "-qm", "docs(handoff): the fixed-range fixture");
  write(root, "src/three.js", "export const three = 3;\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "feat(three): after the range");

  const range = handon({ projectDir: root }).claims.find((claim) => claim.kind === "range");

  assert.equal(range.verdict, "2 commits since the range ended", "the two commits after the end, not the four total");
  rmSync(root, { recursive: true, force: true });
});

test("each file in flight gets its own verdict", () => {
  const verdictFor = (path) => report.claims.find((claim) => claim.kind === "file" && claim.value === path)?.verdict;
  assert.equal(verdictFor("src/keep.js"), "unchanged");
  assert.equal(verdictFor("src/gone.js"), "deleted");
  assert.equal(verdictFor("src/touched.js"), "modified since");
});

test("an ADR that landed after the handoff is reported as accepted", () => {
  const adr = report.claims.find((claim) => claim.kind === "adr" && claim.value === "041");
  assert.ok(adr, "the ADR reference was parsed");
  assert.equal(adr.verdict, "accepted");
});

test("open checklist items are carried over as human judgment", () => {
  const open = report.claims.filter((claim) => claim.kind === "open");
  assert.equal(open.length, 2, "the checked item is not open work");
  assert.equal(open[0].verdict, "unverified, human judgment");
  assert.ok(open[0].value.includes("cacheKey"));
});

test("a claimed command is reported as claimed, never re-run", () => {
  const command = report.claims.find((claim) => claim.kind === "command");
  assert.ok(command, "the command claim was parsed");
  assert.match(command.verdict, /not re-verified/);
  assert.ok(command.value.includes("pnpm run ci"));
});

test("the report separates what holds from what changed", () => {
  for (const heading of ["## Still true", "## Changed since", "## Unverified", "## Next"]) {
    assert.ok(report.text.includes(heading), `the report must carry ${heading}`);
  }
});

test("the report is smaller than the handoff it read", () => {
  const source = readFileSync(join(fixture.root, fixture.handoff), "utf8");
  assert.ok(report.text.length < source.length, `report ${report.text.length} chars vs handoff ${source.length}`);
});

test("and a fraction of a full-length one, not a trim", () => {
  // This used to read `docs/handoff/` in this repository, which made it depend
  // on that directory being non-empty. Handoffs are working files now (ADR 066)
  // and it is empty between sessions, so the length claim gets its own handoff
  // at a realistic size: the small shared fixture cannot show a ratio, only a
  // difference, and the difference is the test above.
  const long = `# Handoff 09: a full-length session

**Branch:** \`main\` - **Range:** \`HEAD~3..HEAD\` - **Date:** 2026-09-01

${"Narrative a resuming reader already lived through, which is most of what a handoff is made of and most of what a verified report drops. ".repeat(20)}

## Files
- \`src/keep.js\`
- \`src/gone.js\`

## Decisions
- ADR 041 is pending.

## Next
- [ ] finish it
`;
  write(fixture.root, "docs/handoff/09-long.md", long);
  const verified = handon({ projectDir: fixture.root, file: "docs/handoff/09-long.md" });
  rmSync(join(fixture.root, "docs/handoff/09-long.md"));

  assert.ok(
    verified.text.length < long.length / 2,
    `report ${verified.text.length} chars vs handoff ${long.length}: a handon should be a fraction, not a trim`,
  );
  console.log(`  handoff ${long.length} chars -> report ${verified.text.length}`);
});

test("a file path is not mistaken for a branch, and a glob is not a file", () => {
  const own = handon({ projectDir: "." });
  const branches = own.claims.filter((claim) => claim.kind === "branch").map((claim) => claim.value);
  assert.ok(
    branches.every((value) => !value.endsWith(".mjs") && !value.endsWith(".js")),
    `a test file was parsed as a branch: ${branches.join(", ")}`,
  );
  const files = own.claims.filter((claim) => claim.kind === "file").map((claim) => claim.value);
  assert.ok(
    files.every((value) => !value.includes("*")),
    `a glob was verified as a path: ${files.join(", ")}`,
  );
});

test("nothing on disk moves", () => {
  const before = snapshot(fixture.root);
  handon({ projectDir: fixture.root });
  assert.equal(snapshot(fixture.root), before, "handon wrote to the working tree");
});

test("--list names every handoff without verifying any", () => {
  const listed = handon({ projectDir: fixture.root, list: true });
  assert.ok(listed.text.includes("07-fixture-session.md"));
  assert.equal(listed.claims.length, 0, "listing verifies nothing");
});

test("a chosen file overrides the newest", () => {
  write(fixture.root, "docs/handoff/02-older.md", "# Handoff 02: older\n\n**Branch:** `main`\n");
  const chosen = handon({ projectDir: fixture.root, file: "docs/handoff/02-older.md" });
  assert.equal(chosen.source, "docs/handoff/02-older.md");
  rmSync(join(fixture.root, "docs/handoff/02-older.md"));
});

test("a malformed handoff reports what parsed and what did not", () => {
  write(fixture.root, "docs/handoff/99-malformed.md", "# Notes\n\nSome prose with no branch, no range, no paths.\n");
  const partial = handon({ projectDir: fixture.root, file: "docs/handoff/99-malformed.md" });
  assert.ok(partial.text.includes("Could not parse"), "the report says what it failed to find");
  assert.ok(partial.text.includes("branch"), "and names the missing claim");
  rmSync(join(fixture.root, "docs/handoff/99-malformed.md"));
});

test("no handoff directory is a clear message, not an invented summary", () => {
  const empty = mkdtempSync(join(tmpdir(), "rule-handon-empty-"));
  const result = handon({ projectDir: empty });
  assert.equal(result.source, undefined);
  assert.ok(result.text.includes("No handoff"), "it says there is nothing to resume from");
  assert.equal(result.claims.length, 0);
  rmSync(empty, { recursive: true, force: true });
});

test("a repository with no git history still reports the handoff", () => {
  const bare = mkdtempSync(join(tmpdir(), "rule-handon-nogit-"));
  write(bare, "docs/handoff/01-x.md", "# Handoff 01: x\n\n**Branch:** `main`\n\n- [ ] finish it\n");
  const result = handon({ projectDir: bare });
  assert.equal(result.source, "docs/handoff/01-x.md");
  const branch = result.claims.find((claim) => claim.kind === "branch");
  assert.equal(branch.verdict, "unverified, no git repository");
  rmSync(bare, { recursive: true, force: true });
});

// ── Tool registration and cache placement ───────────────────────────
//
// The last two suite checks - "the MCP tool is registered" and "it is never
// served from cache" - move with the MCP surface phase, where
// registerProcessHandonTool() wires `rule_tool_process_handon` into the router
// and handon joins the cache denylist. Until then the core verification
// (handon(), the fixture claims, read-only behavior) is what this suite pins.

process.on("exit", () => rmSync(fixture.root, { recursive: true, force: true }));

test("a path git never tracked is not reported as deleted", () => {
  // A handoff names `.internal/roles-accepted.json` to explain where an
  // acceptance is recorded. The directory is gitignored, so the file is absent
  // from a fresh clone and calling it deleted invents a fact - the same failure
  // the glob case fixed, from the other direction.
  const root = mkdtempSync(join(tmpdir(), "rule-handon-ignored-"));
  mkdirSync(join(root, "docs", "handoff"), { recursive: true });
  git(root, "init", "-q");
  git(root, "config", "user.email", "fixture@example.com");
  git(root, "config", "user.name", "Fixture");
  write(root, ".gitignore", ".internal/\n");
  write(root, "src/real.js", "export const real = 1;\n");
  // A real deletion, so the "deleted" verdict has something to be right about.
  write(root, "src/removed.js", "export const removed = 1;\n");
  write(
    root,
    "docs/handoff/01-fixture.md",
    [
      "# Handoff 01: the fixture",
      "",
      "- **Branch**: `main`",
      "- **Date**: 2026-09-04",
      "",
      "The acceptance lands in `.internal/roles-accepted.json`, and the work is in `src/real.js`.",
      "A file that really is gone: `src/removed.js`.",
      "",
    ].join("\n"),
  );
  git(root, "add", "-A");
  git(root, "commit", "-qm", "docs(handoff): the fixture");
  rmSync(join(root, "src", "removed.js"));
  git(root, "add", "-A");
  git(root, "commit", "-qm", "refactor(src): drop removed.js");

  const report = handon({ projectDir: root });
  const verdictFor = (path) => report.claims.find((claim) => claim.kind === "file" && claim.value === path)?.verdict;

  assert.doesNotMatch(verdictFor(".internal/roles-accepted.json") ?? "", /deleted/, "git never tracked it");
  assert.match(
    verdictFor(".internal/roles-accepted.json") ?? "",
    /untracked|ignored|does not track/i,
    "the verdict says why it cannot be checked",
  );
  assert.equal(verdictFor("src/real.js") !== undefined, true, "a tracked file is still verified");
  assert.match(verdictFor("src/removed.js") ?? "", /deleted/, "and a path git knew about is still reported deleted");
});

test("an end this repository cannot find is not reported as HEAD", () => {
  // After a message rewrite the shas move, and a handoff that names the old one
  // is naming a commit that no longer exists. Falling back to counting from the
  // start is right; calling that range "ends at HEAD" is not, because it says
  // the handoff was written open-ended when it named an end that went away.
  const root = mkdtempSync(join(tmpdir(), "rule-handon-lost-"));
  mkdirSync(join(root, "docs", "handoff"), { recursive: true });
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  git(root, "init", "-q");
  git(root, "config", "user.email", "fixture@example.com");
  git(root, "config", "user.name", "Fixture");
  write(root, "src/one.js", "export const one = 1;\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "feat(one): the first");
  const start = git(root, "rev-parse", "HEAD");

  write(
    root,
    "docs/handoff/01-lost-end.md",
    [
      "# Handoff 01: an end that went away",
      "",
      "- **Branch**: `main`",
      `- **Covers**: \`${start.slice(0, 7)}..deadbee\``,
      "- **Date**: 2026-09-04",
      "",
      "## Next, in order of leverage",
      "",
      "1. Nothing yet.",
      "",
    ].join("\n"),
  );
  git(root, "add", "-A");
  git(root, "commit", "-qm", "docs(handoff): the fixture");

  const range = handon({ projectDir: root }).claims.find((claim) => claim.kind === "range");

  assert.match(range.verdict, /^\d+ commits in and since the range/, "counting from the start is the only option");
  assert.doesNotMatch(range.verdict, /ends at HEAD/, "the handoff named an end; it is gone, which is a different fact");
  assert.match(range.verdict, /end .*(gone|not in this repository)/i, "and the report says which");
  rmSync(root, { recursive: true, force: true });
});
