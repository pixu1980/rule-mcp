/**
 * @module test/docs-numbering-doctor/fixture
 *
 * `handoff doctor`: renumber ADRs and handoffs after branches merge.
 *
 * Feature branches allocate the next free number independently, so two of them
 * both write `069-...` and a merge produces a duplicate that no test catches
 * and no reader can order. The doctor detects the collision, orders the
 * documents by when they were actually created (first commit, not filename),
 * and renumbers the later ones - filenames, headers, and every cross-reference
 * that pointed at them.
 *
 * Dry run by default: renaming files and rewriting references is not something
 * a diagnostic does on its own.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

/** A repo whose branches produced two 069s and two 02 handoffs. */
export function seedRepo() {
  const root = mkdtempSync(join(tmpdir(), "rule-doctor-"));
  git(["init", "--quiet", "--initial-branch=main"], root);
  git(["config", "user.email", "t@example.com"], root);
  git(["config", "user.name", "T"], root);
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  mkdirSync(join(root, "docs", "handoff"), { recursive: true });

  const write = (path, body) => writeFileSync(join(root, path), body);
  write("docs/adr/068-first.md", "# 068: First\n\n- **Status**: accepted\n");
  write("docs/adr/069-input-cap.md", "# 069: Input cap\n\n- **Status**: accepted\n\nSupersedes nothing.\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "first"], root);

  // The colliding document, committed later - which is what decides the order.
  write("docs/adr/069-personas.md", "# 069: Personas\n\n- **Status**: accepted\n\nSee ADR 069 for the cap.\n");
  write("docs/handoff/02-alpha.md", "# Handoff 02: alpha\n");
  write("docs/handoff/02-beta.md", "# Handoff 02: beta\n");
  write("docs/adr/ADR.md", "| [069](069-input-cap.md) | Input cap | accepted |\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "second"], root);

  return root;
}

// ── An index that drifted without any collision ──

/** A repo with unique numbers and an index whose rows are in append order. */
export function seedScrambledIndex() {
  const root = mkdtempSync(join(tmpdir(), "rule-doctor-index-"));
  git(["init", "--quiet", "--initial-branch=main"], root);
  git(["config", "user.email", "t@example.com"], root);
  git(["config", "user.name", "T"], root);
  mkdirSync(join(root, "docs", "adr"), { recursive: true });

  for (const [number, slug] of [
    ["079", "the-spy-rail"],
    ["080", "a-documentation-card"],
    ["081", "inputtags-takes-one-data-size"],
    ["082", "a-tab-is-a-neutral-button"],
  ]) {
    writeFileSync(
      join(root, "docs", "adr", `${number}-${slug}.md`),
      `# ${number}: ${slug.replaceAll("-", " ")}\n\n- **Date**: 2026-09-04\n- **Status**: accepted\n- **Tags**: fixture\n`,
    );
  }

  // Append order, which is how a real index drifted: 081 sits above 082, so the
  // run climbs where the generator would descend.
  writeFileSync(
    join(root, "docs", "adr", "ADR.md"),
    [
      "# Decisions",
      "",
      "| ADR | Title | Date | Status | Tags |",
      "|-----|-------|------|--------|------|",
      "| [081](081-inputtags-takes-one-data-size.md) | inputtags | 2026-09-04 | accepted | fixture |",
      "| [082](082-a-tab-is-a-neutral-button.md) | a tab is a neutral button | 2026-09-04 | accepted | fixture |",
      "| [079](079-the-spy-rail.md) | the spy rail | 2026-09-04 | accepted | fixture |",
      "",
    ].join("\n"),
  );
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "docs(adr): the fixture"], root);

  return root;
}

/**
 * A repo whose numbers are unique and ordered, with holes where documents were
 * deleted: 002 and 005 are gone, so the sequence runs 001, 003, 004, 006.
 */
export function seedGappedRepo() {
  const root = mkdtempSync(join(tmpdir(), "rule-doctor-gaps-"));
  git(["init", "--quiet", "--initial-branch=main"], root);
  git(["config", "user.email", "t@example.com"], root);
  git(["config", "user.name", "T"], root);
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  mkdirSync(join(root, "docs", "handoff"), { recursive: true });

  for (const [number, slug] of [
    ["001", "first"],
    ["003", "third"],
    ["004", "fourth"],
    ["006", "sixth"],
  ]) {
    writeFileSync(join(root, "docs", "adr", `${number}-${slug}.md`), `# ${number}: ${slug}\n\n- **Status**: accepted\n`);
  }

  // A reference to a document that moves, and one to a document that does not.
  writeFileSync(join(root, "docs", "adr", "001-first.md"), "# 001: first\n\n- **Status**: accepted\n\nSuperseded by [006](006-sixth.md).\n");
  writeFileSync(join(root, "docs", "adr", "ADR.md"), "| ADR | Title |\n|-----|-------|\n| [006](006-sixth.md) | sixth |\n");
  writeFileSync(join(root, "docs", "handoff", "01-only.md"), "# Handoff 01: only\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "docs(adr): the gapped fixture"], root);

  return root;
}
