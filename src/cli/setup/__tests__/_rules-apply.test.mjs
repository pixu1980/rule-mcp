

/**
 * Install and uninstall must agree on where the block lives - the asymmetry
 * that left Cursor's file dirty forever is what these tests pin down.
 *
 * Every call names its `home`. The module falls back to `homedir()` when it is
 * omitted, and a test that forgets writes the block into the machine running
 * it, so `underTmp` refuses any path that escaped the scaffold.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { applyRules, installableTargets, removableTargets, removeRules } from "../_rules-apply.js";

/** A HOME with claude and cursor present. */
function scaffold() {
  const home = mkdtempSync(join(tmpdir(), "rule-rules-home-"));

  mkdirSync(join(home, ".claude"), { recursive: true });
  mkdirSync(join(home, ".cursor"), { recursive: true });
  writeFileSync(join(home, ".claude", "CLAUDE.md"), "# My rules\n");

  return home;
}

/** Guard: a row naming a file outside the scaffold means the fallback fired. */
function underTmp(rows, home) {
  for (const row of rows) {
    assert.ok(row.file.startsWith(home), `${row.file} escaped the test home`);
  }

  return rows;
}

test("only agents present on the machine are offered", () => {
  const home = scaffold();
  const ids = underTmp(installableTargets(home), home).map((target) => target.id);

  assert.deepEqual(ids.sort(), ["claude", "cursor"]);
});

test("dry-run writes nothing", () => {
  const home = scaffold();
  const results = underTmp(applyRules({ home, dryRun: true }), home);

  assert.ok(results.every((entry) => entry.status.startsWith("would be")));
  assert.equal(readFileSync(join(home, ".claude", "CLAUDE.md"), "utf8"), "# My rules\n");
});

test("apply writes the block, and a second apply refreshes it", () => {
  const home = scaffold();

  assert.ok(underTmp(applyRules({ home }), home).every((entry) => entry.status === "appended"));
  assert.ok(underTmp(applyRules({ home }), home).every((entry) => entry.status === "refreshed"));
  assert.match(readFileSync(join(home, ".claude", "CLAUDE.md"), "utf8"), /rule-mcp-rules/);
});

test("every file install writes is a file uninstall finds", () => {
  const home = scaffold();
  const written = new Set(underTmp(applyRules({ home }), home).map((entry) => entry.file));
  const removable = new Set(underTmp(removableTargets(home), home).map((target) => target.file));

  assert.deepEqual([...written].sort(), [...removable].sort());
});

test("uninstall restores the original file byte for byte", () => {
  const home = scaffold();
  const claudeMd = join(home, ".claude", "CLAUDE.md");

  applyRules({ home });
  removeRules({ home });

  assert.equal(readFileSync(claudeMd, "utf8"), "# My rules\n");
});

test("a legacy Cursor path left by an older install is still cleaned", () => {
  const home = scaffold();
  const legacy = join(home, ".cursor", ".cursorrules");

  applyRules({ home });
  writeFileSync(legacy, readFileSync(join(home, ".cursorrules"), "utf8"));

  const removed = underTmp(removeRules({ home }), home).map((entry) => entry.file);

  assert.ok(removed.includes(legacy), "the legacy path must be swept");
  assert.ok(!readFileSync(legacy, "utf8").includes("rule-mcp-rules"));
});

test("a selection narrows the targets to the agents named", () => {
  const home = scaffold();
  const rows = underTmp(applyRules({ home, agents: ["cursor"] }), home);

  assert.deepEqual(
    rows.map((entry) => entry.id),
    ["cursor"],
  );
  assert.equal(readFileSync(join(home, ".claude", "CLAUDE.md"), "utf8"), "# My rules\n");
});
