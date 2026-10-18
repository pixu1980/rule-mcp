

/**
 * @module test/handon/fixture
 *
 * Shared plumbing for the handon suite: the temp HOME, the git/write/snapshot
 * helpers and the scripted repository whose handoff has gone stale in four
 * different ways - the branch got merged, one file was deleted, another was
 * modified, and the ADR that was pending landed.
 *
 * @see ADR 052 - why handon verifies rather than summarizes
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import "../../../../tests/fixtures/git-hermetic.mjs";

process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
// Every scripted repository is a project, and a project gets a recording under
// the home directory. homedir() reads HOME, so this keeps them in a temp one.
process.env.HOME = mkdtempSync(join(tmpdir(), "rule-handon-home-"));

export const { handon } = await import("../index.js");

export const git = (cwd, ...arguments_) => execFileSync("git", arguments_, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

export const write = (root, relativePath, body) => {
  mkdirSync(join(root, relativePath, ".."), { recursive: true });
  writeFileSync(join(root, relativePath), body);
};

/** Every file in the tree, with size and mtime, for the no-write assertion. */
export function snapshot(root) {
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
export function scriptedRepository() {
  const root = mkdtempSync(join(tmpdir(), "rule-handon-"));
  git(root, "init", "--initial-branch=main", "-q");
  git(root, "config", "user.email", "fixture@example.com");
  git(root, "config", "user.name", "Fixture");

  write(root, "src/keep.js", "export const keep = 1;\n");
  write(root, "src/gone.js", "export const gone = 1;\n");
  write(root, "src/touched.js", "export const touched = 1;\n");
  write(root, "docs/adr/041-a-pending-decision.md", "# 041: A pending decision\n\n- **Date**: 2026-08-01\n- **Status**: proposed\n- **Tags**: fixture\n");
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
  write(root, "docs/adr/041-a-pending-decision.md", "# 041: A pending decision\n\n- **Date**: 2026-08-01\n- **Status**: accepted\n- **Tags**: fixture\n");
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

export const fixture = scriptedRepository();
export const report = handon({ projectDir: fixture.root });

process.on("exit", () => rmSync(fixture.root, { recursive: true, force: true }));
