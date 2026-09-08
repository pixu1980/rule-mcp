/** orphanedPathReferences: the empty-log arm and the ambiguous-slug skip. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { orphanedPathReferences } from "../index.js";

/** Run git quietly in the fixture repo. */
function git(root, ...args) {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

/** A bare-bones repo with one commit whose message names a missing ADR path. */
function seed({ candidates }) {
  const root = mkdtempSync(join(tmpdir(), "rule-orphans-"));
  git(root, "init", "-q");
  git(root, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "--allow-empty", "-q", "-m", "docs(adr): retire docs/adr/001-old-slug.md");
  mkdirSync(join(root, "docs", "adr"), { recursive: true });

  for (let index = 0; index < candidates; index += 1) {
    writeFileSync(join(root, "docs", "adr", `00${index + 2}-old-slug.md`), "# moved\n");
  }

  return root;
}

test("a repo with no commits contributes no orphans", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-orphans-empty-"));
  git(root, "init", "-q");

  assert.deepEqual(orphanedPathReferences({ projectDir: root }), [], "an empty log reads empty");
  rmSync(root, { recursive: true, force: true });
});

test("a missing path with exactly one slug match is stated as a rename", () => {
  const root = seed({ candidates: 1 });
  const found = orphanedPathReferences({ projectDir: root });

  assert.equal(found.length, 1, "the single candidate is a statable rename");
  assert.equal(found[0].from, "docs/adr/001-old-slug.md", "the missing path is named");
  assert.equal(found[0].to, "docs/adr/002-old-slug.md", "the surviving slug is the target");
  rmSync(root, { recursive: true, force: true });
});

test("zero or many slug matches are skipped rather than guessed", () => {
  const none = seed({ candidates: 0 });
  assert.deepEqual(orphanedPathReferences({ projectDir: none }), [], "no candidate means no guess");
  rmSync(none, { recursive: true, force: true });

  const many = seed({ candidates: 2 });
  assert.deepEqual(orphanedPathReferences({ projectDir: many }), [], "two candidates mean ambiguity, not a rename");
  rmSync(many, { recursive: true, force: true });
});
