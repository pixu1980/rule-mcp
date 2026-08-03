// test/architect-overwrite-guard.test.mjs
//
// F10: generateContext writes seven "root" entry files (AGENTS.md, CLAUDE.md,
// GEMINI.md, .clinerules, .github/copilot-instructions.md,
// .cursor/rules/project.mdc, .windsurf/rules/project.md) straight into the
// user's project root — right next to any hand-authored CLAUDE.md / AGENTS.md.
// Before this guard it clobbered them silently. Contract:
//
//   - An EXISTING root file is skipped, never overwritten, unless the caller
//     passes { force: true }. Skipped paths are reported back so a CLI/server
//     can tell the user.
//   - `.context/` is architect-owned scaffold: it is ALWAYS (re)written, guard
//     or no guard, so re-running the wizard to refresh the pack still works.
//   - Each root file is guarded INDEPENDENTLY: an existing AGENTS.md being
//     skipped must not stop a not-yet-existing CLAUDE.md from being written
//     from the freshly-rendered body.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateContext } from "../skills/rule-architect/generator.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const spec = JSON.parse(readFileSync(join(ROOT, "skills/rule-architect/wizard-spec.json"), "utf-8"));
const ANSWERS = { PROJECT_NAME: "AcmeApp" };

const ROOT_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  ".clinerules",
  ".github/copilot-instructions.md",
  ".cursor/rules/project.mdc",
  ".windsurf/rules/project.md",
];

function temporary() {
  return mkdtempSync(join(tmpdir(), "architect-guard-"));
}

test("fresh project: every root file is written and nothing is skipped", () => {
  const dir = temporary();
  try {
    const { files, skipped } = generateContext(ANSWERS, spec, dir);
    assert.deepEqual(skipped, [], "a clean project must skip nothing");
    for (const rel of ROOT_FILES) {
      assert.ok(existsSync(join(dir, rel)), `${rel} must be written on a fresh project`);
    }
    // Every reported root entry is flagged written, none skipped.
    const roots = files.filter((f) => f.root);
    assert.ok(roots.length >= ROOT_FILES.length, "all root entries reported");
    assert.ok(roots.every((f) => f.written === true && !f.skipped), "fresh roots are written, not skipped");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an existing root file is preserved, not overwritten, and reported as skipped", () => {
  const dir = temporary();
  try {
    const SENTINEL = "# MY HAND-WRITTEN CLAUDE.md — DO NOT TOUCH\n";
    writeFileSync(join(dir, "CLAUDE.md"), SENTINEL, "utf-8");

    const { skipped } = generateContext(ANSWERS, spec, dir);

    assert.equal(readFileSync(join(dir, "CLAUDE.md"), "utf-8"), SENTINEL, "hand-authored CLAUDE.md must survive");
    assert.ok(skipped.includes("CLAUDE.md"), `skipped must list CLAUDE.md — got ${JSON.stringify(skipped)}`);
    // The other root files, which did not exist, are still written.
    assert.ok(existsSync(join(dir, "AGENTS.md")), "AGENTS.md (absent) must still be written");
    assert.ok(existsSync(join(dir, "GEMINI.md")), "GEMINI.md (absent) must still be written");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("skipping an existing AGENTS.md does not block the fan-out files", () => {
  // AGENTS.md is the source body every fan-out file copies. Even when AGENTS.md
  // itself is skipped, CLAUDE.md et al. must be written from the rendered body.
  const dir = temporary();
  try {
    writeFileSync(join(dir, "AGENTS.md"), "# pre-existing\n", "utf-8");
    const { skipped } = generateContext(ANSWERS, spec, dir);
    assert.ok(skipped.includes("AGENTS.md"), "AGENTS.md must be skipped");
    assert.ok(existsSync(join(dir, "CLAUDE.md")), "CLAUDE.md must be written despite AGENTS.md being skipped");
    assert.ok(readFileSync(join(dir, "CLAUDE.md"), "utf-8").length > 40, "CLAUDE.md carries the rendered body");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("{ force: true } overwrites an existing root file", () => {
  const dir = temporary();
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "# stale\n", "utf-8");
    const { skipped } = generateContext(ANSWERS, spec, dir, { force: true });
    assert.deepEqual(skipped, [], "force must skip nothing");
    assert.notEqual(readFileSync(join(dir, "CLAUDE.md"), "utf-8"), "# stale\n", "force must overwrite CLAUDE.md");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test(".context/ is always regenerated, guard or not — it is not a guarded root file", () => {
  const dir = temporary();
  try {
    // Seed a .context/ file with sentinel content, then regenerate WITHOUT force.
    mkdirSync(join(dir, ".context"), { recursive: true });
    const seeded = join(dir, ".context", "AGENTS.md");
    // Use a real .context path the generator emits. specs/00-sdd.md is stable.
    mkdirSync(join(dir, ".context", "specs"), { recursive: true });
    const sdd = join(dir, ".context", "specs", "00-sdd.md");
    writeFileSync(sdd, "STALE CONTEXT — MUST BE OVERWRITTEN\n", "utf-8");

    const { skipped } = generateContext(ANSWERS, spec, dir);

    assert.notEqual(
      readFileSync(sdd, "utf-8"),
      "STALE CONTEXT — MUST BE OVERWRITTEN\n",
      ".context/ files must always be regenerated"
    );
    assert.ok(!skipped.includes("specs/00-sdd.md"), ".context files are never reported as skipped");
    void seeded;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("skipped paths are project-root-relative and cover only root files", () => {
  const dir = temporary();
  try {
    for (const rel of [".clinerules", ".cursor/rules/project.mdc"]) {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), "existing\n", "utf-8");
    }
    const { skipped } = generateContext(ANSWERS, spec, dir);
    assert.deepEqual(
      [...skipped].sort(),
      [".clinerules", ".cursor/rules/project.mdc"].sort(),
      "skipped must be exactly the pre-existing root files, root-relative"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
