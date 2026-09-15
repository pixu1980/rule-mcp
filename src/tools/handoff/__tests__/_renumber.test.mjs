

/**
 * Automatic renumbering: a close-session handoff plans and applies it, a plain
 * handoff (and a dry run) leaves the files where they are.
 */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { seedRepo } from "../../../../tests/docs/docs-numbering-doctor/_doctor.fixture.mjs";
import { buildHandoff } from "../_build.js";
import { autoRenumber, renumberLines } from "../_renumber.js";

/** A clean project with one ADR and no index. */
function cleanProject() {
  const root = mkdtempSync(join(tmpdir(), "rule-renumber-clean-"));

  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  writeFileSync(join(root, "docs/adr/001-one.md"), "# 001: One\n");

  return root;
}

test("autoRenumber leaves a clean project alone", () => {
  const root = cleanProject();

  try {
    const result = autoRenumber(root);

    assert.equal(result.needed, false);
    assert.equal(result.applied, null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("autoRenumber plans without applying", () => {
  const root = seedRepo();

  try {
    const result = autoRenumber(root, { apply: false });

    assert.equal(result.needed, true);
    assert.equal(result.applied, null);
    assert.ok(existsSync(join(root, "docs/adr/069-personas.md")), "a dry run leaves the file in place");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("autoRenumber applies the plan", () => {
  const root = seedRepo();

  try {
    const result = autoRenumber(root, { apply: true });

    assert.ok(result.applied.renamed > 0);
    assert.equal(existsSync(join(root, "docs/adr/069-personas.md")), false, "the later collision moved");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a close-session handoff renumbers before it writes the ADR log", () => {
  const root = seedRepo();

  try {
    const closed = buildHandoff({ projectDir: root, mode: "close-session", maxTokens: 0, format: "full" });

    assert.match(closed.text, /### Renumber/);
    assert.match(closed.text, /Renumbered \d+ document/);
    assert.equal(existsSync(join(root, "docs/adr/069-personas.md")), false, "the repair ran");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a plain handoff renumbers nothing", () => {
  const root = seedRepo();

  try {
    buildHandoff({ projectDir: root, mode: "handoff", maxTokens: 0, format: "full" });

    assert.ok(existsSync(join(root, "docs/adr/069-personas.md")), "a plain handoff is read-only");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("renumberLines renders the applied and pending forms", () => {
  const applied = renumberLines({ needed: true, plan: { renames: [] }, applied: { renamed: 1, referencesUpdated: 2, indexRegenerated: true } }, { isMinimal: false });

  assert.match(applied.join("\n"), /Renumbered 1 document/);

  const pending = renumberLines({ needed: true, plan: { renames: [1, 2] }, applied: null }, { isMinimal: false });

  assert.match(pending.join("\n"), /2 collision/);
});
