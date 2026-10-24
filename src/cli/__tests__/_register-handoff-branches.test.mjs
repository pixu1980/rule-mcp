/**
 * `handoff doctor`, driven through commander in this process: the plan that
 * repairs nothing, an index rebuilt for one family and not the other, and the
 * commit rewrite that refuses to touch a tree with uncommitted work.
 *
 * The action is the CLI entry point, so the program is assembled the same way
 * `bin/rule-mcp.js` assembles it and its stdout is captured instead of printed.
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { Command } from "commander";

import { registerHandoffCommand } from "../_register-handoff.js";
import { makeRepo, remove, run } from "../../core/git/__tests__/_fixture.mjs";

/** Run `handoff doctor` in-process and return what it wrote and its exit code. */
async function doctor(args) {
  const program = new Command().exitOverride();

  registerHandoffCommand(program);

  const written = [];
  const stdout = process.stdout.write.bind(process.stdout);

  process.stdout.write = (chunk) => {
    written.push(String(chunk));

    return true;
  };

  try {
    await program.parseAsync(["handoff", "doctor", ...args], { from: "user" });
  } finally {
    process.stdout.write = stdout;
  }

  const exitCode = process.exitCode;

  process.exitCode = 0;

  return { output: written.join(""), exitCode };
}

/** Write one document and stage it. */
function document(root, path, body) {
  mkdirSync(join(root, path, ".."), { recursive: true });
  writeFileSync(join(root, path), body);
}

test("a repository with nothing to repair exits zero and renumbers nothing", async () => {
  const root = makeRepo();

  try {
    const { output, exitCode } = await doctor(["--dir", root]);

    assert.match(output, /Numbering is clean/u, "a repository with no numbered documents is not a failure");
    assert.match(output, /Read 0 ADR document\(s\)/u, "the plan scanned both families");
    assert.match(output, /Read 0 handoff document\(s\)/u, "including the one with no directory");
    assert.doesNotMatch(output, /Renumbered/u, "nothing was moved");
    assert.doesNotMatch(output, /Commit messages left alone/u, "and no commit rewrite was attempted");
    assert.equal(exitCode, 0, "a clean plan exits zero");
  } finally {
    remove(root);
  }
});

test("an ADR renumber rebuilds the ADR index and leaves the handoff one alone", async () => {
  const root = makeRepo();
  const later = join(root, "docs", "adr", "001-second.md");

  try {
    document(root, "docs/adr/001-first.md", "# 001: First\n\n- **Author**: Fixture Person\n");
    run(root, "add", "-A");
    run(root, "commit", "-q", "-m", "docs(adr): first");
    document(root, "docs/adr/001-second.md", "# 001: Second\n\n- **Author**: Fixture Person\n");
    run(root, "add", "-A");
    run(root, "commit", "-q", "-m", "docs(adr): a second document claims the number");

    const { output } = await doctor(["--dir", root, "--fix"]);

    assert.ok(later.length > 0, "the fixture wrote the colliding document");
    assert.match(output, /Renumbered 1 document\(s\)/u, "the later holder moved");
    assert.match(output, /ADR\.md regenerated/u, "the ADR index is rebuilt after a move");
    assert.doesNotMatch(output, /HANDOFF\.md regenerated/u, "a family with no documents gets no index invented for it");
    assert.doesNotMatch(output, /author\(s\) named/u, "an ADR that already names a person is left alone");
    assert.match(output, /Commit messages were not touched/u, "the messages are only amended on request");
  } finally {
    remove(root);
  }
});

test("a handoff renumber rebuilds the handoff index and leaves the ADR one alone", async () => {
  const root = makeRepo();

  try {
    document(root, "docs/handoff/01-first.md", "# Handoff 01: First\n");
    run(root, "add", "-A");
    run(root, "commit", "-q", "-m", "docs(handoff): first");
    document(root, "docs/handoff/01-second.md", "# Handoff 01: Second\n");
    run(root, "add", "-A");
    run(root, "commit", "-q", "-m", "docs(handoff): a second document claims the number");

    const { output } = await doctor(["--dir", root, "--fix"]);

    assert.match(output, /HANDOFF\.md regenerated/u, "the handoff index is rebuilt after a move");
    assert.doesNotMatch(output, /ADR\.md regenerated/u, "and no ADR index is written where no ADR lives");
    assert.doesNotMatch(output, /author\(s\) named/u, "the author repair belongs to ADRs only");
  } finally {
    remove(root);
  }
});

test("an ADR that names a tool has its author named when the plan is applied", async () => {
  const root = makeRepo();

  try {
    document(root, "docs/adr/001-first.md", "# 001: First\n\n- **Author**: rule-mcp\n");
    run(root, "add", "-A");
    run(root, "commit", "-q", "-m", "docs(adr): first");
    document(root, "docs/adr/001-second.md", "# 001: Second\n\n- **Author**: Fixture Person\n");
    run(root, "add", "-A");
    run(root, "commit", "-q", "-m", "docs(adr): a second document claims the number");

    const { output } = await doctor(["--dir", root, "--fix"]);

    assert.match(output, /author\(s\) named/u, "the tool author is replaced by the person the commit records");
    assert.doesNotMatch(output, /rule\n?$/u, "the tool name does not survive as the author line");
  } finally {
    remove(root);
  }
});

test("--fix-commits refuses to rewrite history when the tree has uncommitted work", async () => {
  const root = makeRepo();

  try {
    document(root, "docs/adr/001-first.md", "# 001: First\n\n- **Author**: Fixture Person\n");
    run(root, "add", "-A");
    run(root, "commit", "-q", "-m", "docs(adr): first");
    document(root, "docs/adr/001-second.md", "# 001: Second\n\n- **Author**: Fixture Person\n");
    run(root, "add", "-A");
    run(root, "commit", "-q", "-m", "docs(adr): second\n\nNames docs/adr/001-second.md, which the plan moves.");
    // A tracked change, left uncommitted: amending a message rewrites every
    // commit after it, so the rewrite has to refuse.
    document(root, "docs/adr/001-first.md", "# 001: First\n\n- **Author**: Fixture Person\n\nDirty.\n");

    const { output, exitCode } = await doctor(["--dir", root, "--fix-commits"]);

    assert.match(output, /Commit messages left alone: /u, "the refusal is reported rather than performed");
    assert.match(output, /uncommitted changes/u, "and names the reason git cannot be asked to rewrite");
    assert.equal(exitCode, 1, "a plan that still has work to do exits non-zero when --fix was not passed");
  } finally {
    remove(root);
  }
});
