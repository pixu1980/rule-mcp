/**
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
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  renderRenumberPlan,
  planRenumber,
  applyRenumber,
  rewriteCommitReferences,
  staleCommitReferences,
} from "../../src/core/docs-numbering/index.js";

const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

/** A repo whose branches produced two 069s and two 02 handoffs. */
function seedRepo() {
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

test("a clean tree reports nothing to do", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-doctor-clean-"));
  try {
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(join(root, "docs", "adr", "001-one.md"), "# 001: One\n");
    writeFileSync(join(root, "docs", "adr", "002-two.md"), "# 002: Two\n");
    const plan = planRenumber({ projectDir: root });
    assert.deepEqual(plan.collisions, []);
    assert.deepEqual(plan.renames, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("collisions are detected and ordered by creation, not by name", () => {
  const root = seedRepo();
  try {
    const plan = planRenumber({ projectDir: root });
    assert.equal(plan.collisions.length, 2, "one ADR collision and one handoff collision");
    const adr = plan.renames.find((rename) => rename.from.endsWith("069-personas.md"));
    assert.ok(adr, "the later 069 is the one that moves");
    assert.match(adr.to, /070-personas\.md$/, "it takes the next free number");
    assert.ok(
      plan.renames.every((rename) => !rename.from.endsWith("069-input-cap.md")),
      "the earlier document keeps its number",
    );
    const handoff = plan.renames.find((rename) => rename.from.endsWith("02-beta.md"));
    assert.match(handoff.to, /03-beta\.md$/, "handoffs renumber on their own sequence");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a dry run changes nothing on disk", () => {
  const root = seedRepo();
  try {
    planRenumber({ projectDir: root });
    assert.ok(existsSync(join(root, "docs", "adr", "069-personas.md")), "dry run leaves the file where it was");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applying moves the file, fixes its header, and follows the references", () => {
  const root = seedRepo();
  try {
    const plan = planRenumber({ projectDir: root });
    const result = applyRenumber(plan, { projectDir: root });
    assert.equal(result.renamed, 2, "one ADR collision and one handoff collision, one move each");
    assert.ok(existsSync(join(root, "docs", "adr", "070-personas.md")));
    assert.ok(!existsSync(join(root, "docs", "adr", "069-personas.md")));
    const moved = readFileSync(join(root, "docs", "adr", "070-personas.md"), "utf8");
    assert.match(moved, /^# 070: Personas/m, "the header carries the new number");
    const index = readFileSync(join(root, "docs", "adr", "ADR.md"), "utf8");
    assert.match(index, /069-input-cap\.md/, "a reference to an unmoved document is left alone");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a link to a renumbered document is rewritten", () => {
  const root = seedRepo();
  try {
    writeFileSync(join(root, "docs", "adr", "068-first.md"), "# 068: First\n\nSee [069](069-personas.md).\n");
    const plan = planRenumber({ projectDir: root });
    applyRenumber(plan, { projectDir: root });
    const referrer = readFileSync(join(root, "docs", "adr", "068-first.md"), "utf8");
    assert.match(referrer, /\[070\]\(070-personas\.md\)/, "both the label and the target move");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── The commit messages a renumber leaves behind ──

test("commit messages that name a renumbered document are reported", () => {
  const root = seedRepo();
  // A commit that refers to the document about to move, the way this project
  // writes them: "ADR 069" in the subject and the path in the body.
  writeFileSync(join(root, "docs/adr/069-personas.md"), "# 069: Personas\n\n- **Status**: accepted\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "docs(adr): accept ADR 069\n\nSee docs/adr/069-personas.md for the decision."], root);

  const plan = planRenumber({ projectDir: root });
  const stale = staleCommitReferences(plan, { projectDir: root });

  assert.ok(stale.length > 0, "the commit naming the moved document has to be reported");
  const hit = stale.find((entry) => entry.subject.includes("accept ADR 069"));
  assert.ok(hit, `expected that commit among ${JSON.stringify(stale.map((e) => e.subject))}`);
  assert.equal(hit.file, "docs/adr/069-personas.md", "the report names the document that moved");
  assert.equal(hit.toNumber, "070", "and the number it moved to");
  assert.match(hit.sha, /^[0-9a-f]{7,40}$/);
  assert.equal(hit.match, "path", "it names the file, so the reference is certainly stale");
});

test("a message naming only the number is reported as ambiguous, not as stale", () => {
  const root = seedRepo();
  git(["commit", "--quiet", "--allow-empty", "-m", "docs(adr): accept ADR 069"], root);

  const stale = staleCommitReferences(planRenumber({ projectDir: root }), { projectDir: root });
  const hit = stale.find((entry) => entry.subject === "docs(adr): accept ADR 069");

  assert.ok(hit, "it still has to be surfaced");
  assert.equal(
    hit.match,
    "number",
    "two documents held 069, so which one the message meant cannot be read from the message",
  );
});

test("a commit that names the document keeping its number is left alone", () => {
  const root = seedRepo();
  git(["commit", "--quiet", "--allow-empty", "-m", "docs(adr): note 068-first.md"], root);

  const plan = planRenumber({ projectDir: root });
  const stale = staleCommitReferences(plan, { projectDir: root });

  assert.equal(
    stale.some((entry) => entry.subject.includes("068-first")),
    false,
    "068 does not move, so no commit about it is stale",
  );
});

test("the report says nothing when there is nothing to renumber", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-doctor-clean-"));
  git(["init", "--quiet", "--initial-branch=main"], root);
  git(["config", "user.email", "t@example.com"], root);
  git(["config", "user.name", "T"], root);
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  writeFileSync(join(root, "docs/adr/001-only.md"), "# 001: Only\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "docs(adr): add 001"], root);

  assert.deepEqual(staleCommitReferences(planRenumber({ projectDir: root }), { projectDir: root }), []);
});

// ── The index the renumber has to regenerate ──

test("applying regenerates the ADR index instead of patching its links", () => {
  const root = seedRepo();
  // A hand-patched index is what ADR 051 retired: the rows, the titles and the
  // order all come from the files, so the repair regenerates rather than edits.
  const plan = planRenumber({ projectDir: root });
  const result = applyRenumber(plan, { projectDir: root });

  const index = readFileSync(join(root, "docs/adr/ADR.md"), "utf8");
  assert.match(index, /070-personas\.md/, "the moved document is in the index under its new number");
  assert.doesNotMatch(index, /069-personas\.md/, "and not under the old one");
  assert.match(index, /069-input-cap\.md/, "the document that kept 069 is still there");
  assert.equal(result.indexRegenerated, true, "the result says the index was rebuilt");

  // Every table in the index is newest first. Patching links in place would have
  // left the renumbered row where the old number sorted, which is the reason
  // this regenerates instead of editing.
  // The index holds several tables, each newest first, so the check is per run
  // of adjacent rows rather than over the file.
  const runs = [];

  for (const line of index.split("\n")) {
    const row = line.match(/^\| \[(\d{3})\]/);

    if (row) {
      (runs.at(-1)?.open ? runs.at(-1) : runs[runs.push({ open: true, numbers: [] }) - 1]).numbers.push(Number(row[1]));
      continue;
    }

    if (runs.at(-1)) {
      runs.at(-1).open = false;
    }
  }

  const ordered = runs.filter((run) => run.numbers.length > 1);
  assert.ok(ordered.length > 0, "the index has a table with rows to order");

  for (const run of ordered) {
    assert.deepEqual(
      run.numbers,
      [...run.numbers].sort((a, b) => b - a),
      "each table runs newest first",
    );
  }
});

// ── Commit messages: reported always, rewritten only when asked ──

test("--fix-commits rewrites the certainly-stale messages and leaves the ambiguous ones", () => {
  const root = seedRepo();
  writeFileSync(join(root, "docs/adr/069-personas.md"), "# 069: Personas\n\n- **Status**: accepted\n");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "docs(adr): accept docs/adr/069-personas.md"], root);
  git(["commit", "--quiet", "--allow-empty", "-m", "docs(adr): accept ADR 069"], root);

  const plan = planRenumber({ projectDir: root });
  const rewritten = rewriteCommitReferences(plan, { projectDir: root });

  assert.equal(rewritten.rewritten, 1, "one message named the file");
  assert.equal(rewritten.skipped, 1, "the number-only one is left for a human");

  const log = git(["log", "--format=%s%n%b"], root);
  assert.match(log, /070-personas\.md/, "the rewritten message points at the new path");
  assert.match(log, /docs\(adr\): accept ADR 069/, "the ambiguous message is untouched");
});

test("a published commit is never rewritten", () => {
  const root = seedRepo();
  // The message has to name the moved file, or there is nothing to refuse.
  git(["commit", "--quiet", "--allow-empty", "-m", "docs(adr): accept docs/adr/069-personas.md"], root);
  const bare = mkdtempSync(join(tmpdir(), "rule-doctor-remote-"));
  git(["init", "--quiet", "--bare"], bare);
  git(["remote", "add", "origin", bare], root);
  git(["push", "--quiet", "-u", "origin", "main"], root);

  const plan = planRenumber({ projectDir: root });
  const rewritten = rewriteCommitReferences(plan, { projectDir: root });

  assert.equal(rewritten.rewritten, 0, "nothing is rewritten once it is published");
  assert.match(rewritten.refused ?? "", /published|pushed|upstream/i, "and the refusal says why");
});

// ── An index that drifted without any collision ──

/** A repo with unique numbers and an index whose rows are in append order. */
function seedScrambledIndex() {
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

test("an out-of-order index is reported even when no number collides", () => {
  const root = seedScrambledIndex();
  const plan = planRenumber({ projectDir: root });

  assert.equal(plan.renames.length, 0, "nothing collides in this repo");
  assert.equal(plan.indexUnordered, true, "but its rows are not newest first");
  assert.match(renderRenumberPlan(plan), /index/i, "and the report says so instead of calling the tree clean");
});

test("applying regenerates an out-of-order index with no renames to do", () => {
  const root = seedScrambledIndex();
  const result = applyRenumber(planRenumber({ projectDir: root }), { projectDir: root });

  assert.equal(result.indexRegenerated, true);

  const rows = [...readFileSync(join(root, "docs/adr/ADR.md"), "utf8").matchAll(/^\| \[(\d{3})\]/gm)].map((m) =>
    Number(m[1]),
  );
  assert.deepEqual(rows.slice(0, 4), [82, 81, 80, 79], "every ADR is listed, newest first");
});

test("a matching index is left alone", () => {
  const root = seedScrambledIndex();
  applyRenumber(planRenumber({ projectDir: root }), { projectDir: root });

  const second = planRenumber({ projectDir: root });
  assert.equal(second.indexUnordered, false, "regenerating twice finds nothing to do");
  assert.match(renderRenumberPlan(second), /clean/i);
});

test("the report does not tell a caller running --fix to run --fix", () => {
  const unordered = planRenumber({ projectDir: seedScrambledIndex() });
  assert.match(renderRenumberPlan(unordered), /--fix/, "report mode says how to repair it");
  assert.doesNotMatch(renderRenumberPlan(unordered, { fix: true }), /Run with --fix/, "and --fix mode does not");

  const collisions = planRenumber({ projectDir: seedRepo() });
  assert.match(renderRenumberPlan(collisions), /Run with --fix/);
  assert.doesNotMatch(renderRenumberPlan(collisions, { fix: true }), /Run with --fix/);
});

// ── The author field, and a repair that runs after the renaming is done ──

test("an ADR whose author is the tool, or missing, is reported", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-doctor-author-"));
  try {
    git(["init", "--quiet", "--initial-branch=main"], root);
    git(["config", "user.email", "ada@example.com"], root);
    git(["config", "user.name", "Ada Lovelace"], root);
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(
      join(root, "docs", "adr", "001-tool-author.md"),
      "# 001: Tool author\n\n- **Status**: accepted\n- **Tags**: x\n- **Author**: rule-mcp\n",
    );
    writeFileSync(
      join(root, "docs", "adr", "002-no-author.md"),
      "# 002: No author\n\n- **Status**: accepted\n- **Tags**: x\n",
    );
    writeFileSync(
      join(root, "docs", "adr", "003-a-person.md"),
      "# 003: A person\n\n- **Status**: accepted\n- **Tags**: x\n- **Author**: Grace Hopper <grace@example.com>\n",
    );
    git(["add", "-A"], root);
    git(["commit", "--quiet", "-m", "docs(adr): three decisions"], root);

    const plan = planRenumber({ projectDir: root });

    assert.deepEqual(
      plan.authors.map((entry) => entry.file).sort(),
      ["docs/adr/001-tool-author.md", "docs/adr/002-no-author.md"],
      "the tool name and the missing line are both the same problem",
    );
    assert.equal(plan.authors[0].author, "Ada Lovelace <ada@example.com>", "the author comes from the adding commit");
    assert.match(renderRenumberPlan(plan), /author/i, "the report says so");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applying names the person who decided", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-doctor-author-fix-"));
  try {
    git(["init", "--quiet", "--initial-branch=main"], root);
    git(["config", "user.email", "ada@example.com"], root);
    git(["config", "user.name", "Ada Lovelace"], root);
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(
      join(root, "docs", "adr", "001-tool-author.md"),
      "# 001: Tool author\n\n- **Status**: accepted\n- **Tags**: x\n- **Author**: rule-mcp\n",
    );
    writeFileSync(
      join(root, "docs", "adr", "002-no-author.md"),
      "# 002: No author\n\n- **Status**: accepted\n- **Tags**: x\n",
    );
    git(["add", "-A"], root);
    git(["commit", "--quiet", "-m", "docs(adr): two decisions"], root);

    const applied = applyRenumber(planRenumber({ projectDir: root }), { projectDir: root });

    assert.equal(applied.authorsNamed, 2, "both files were repaired");
    assert.match(
      readFileSync(join(root, "docs", "adr", "001-tool-author.md"), "utf8"),
      /^- \*\*Author\*\*: Ada Lovelace <ada@example\.com>$/m,
      "the tool name was replaced",
    );
    assert.match(
      readFileSync(join(root, "docs", "adr", "002-no-author.md"), "utf8"),
      /^- \*\*Tags\*\*: x\n- \*\*Author\*\*: Ada Lovelace <ada@example\.com>$/m,
      "the missing line was added next to the tags",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--fix-commits repairs a message after the renaming has already happened", () => {
  // The case a second run hits: --fix moved the file, the message still names
  // the old path, and the plan has no renames left to derive it from.
  const root = seedRepo();
  git(["commit", "--quiet", "--allow-empty", "-m", "docs(adr): accept docs/adr/069-personas.md"], root);
  applyRenumber(planRenumber({ projectDir: root }), { projectDir: root });
  // A previous run committed its renames, which is what leaves the messages
  // behind as the only thing still pointing at the old path.
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "docs(adr): renumber"], root);

  const plan = planRenumber({ projectDir: root });
  assert.deepEqual(plan.renames, [], "the numbering is already clean");

  const rewritten = rewriteCommitReferences(plan, { projectDir: root });

  assert.equal(rewritten.rewritten, 1, "the stale path is still repairable from the slug");
  assert.match(git(["log", "--format=%s%n%b"], root), /070-personas\.md/, "and points at the file that exists");
  rmSync(root, { recursive: true, force: true });
});

test("progress is reported while the work happens, not only at the end", () => {
  const root = seedRepo();
  try {
    const steps = [];
    const onProgress = (step) => steps.push(step);
    planRenumber({ projectDir: root, onProgress });
    applyRenumber(planRenumber({ projectDir: root }), { projectDir: root, onProgress });

    assert.ok(steps.length >= 2, `something has to be reported: ${JSON.stringify(steps)}`);
    assert.ok(
      steps.every((step) => typeof step.message === "string" && step.message.length > 0),
      "every step carries a line a person can read",
    );
    assert.ok(
      steps.some((step) => /scan|read/i.test(step.message)),
      "the scan says it is scanning",
    );
    assert.ok(
      steps.some((step) => /renam|referen|index/i.test(step.message)),
      "and the repair says what it is repairing",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the CLI prints its steps while it works, not just a summary", () => {
  const root = seedRepo();
  try {
    const bin = join(process.cwd(), "bin", "rule-mcp.js");
    const out = execFileSync(process.execPath, [bin, "handoff", "doctor", "--dir", root], {
      encoding: "utf8",
      env: { ...process.env, RULE_MCP_NO_AUTOUPDATE: "1" },
      // A dry run reports work to do, which is exit 1 by design.
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();

    assert.match(out, /Scanning docs[/\\]adr/, "the scan announces itself");
    assert.match(out, /Read \d+ ADR document\(s\)/, "and says what it found");
    assert.match(out, /collision\(s\) found/, "the summary still arrives");
    assert.ok(
      out.indexOf("Scanning") < out.indexOf("collision(s) found"),
      "the steps come before the summary, which is the point of printing them",
    );
  } catch (error) {
    // exit 1 is the dry-run verdict, and execFileSync throws on it.
    const out = String(error.stdout ?? "");
    assert.match(out, /Scanning docs[/\\]adr/, `the scan announces itself: ${out}`);
    assert.match(out, /collision\(s\) found/, "the summary still arrives");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
