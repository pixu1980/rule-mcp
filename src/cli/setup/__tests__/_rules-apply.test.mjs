/**
 * Install and uninstall must agree on where the block lives - the asymmetry
 * that left Cursor's file dirty forever is what these tests pin down.
 */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { applyRules, installableTargets, removableTargets, removeRules } from "../_rules-apply.js";

/** A HOME with claude and cursor present, plus a project dir. */
function scaffold() {
  const home = mkdtempSync(join(tmpdir(), "rule-rules-home-"));
  const cwd = mkdtempSync(join(tmpdir(), "rule-rules-cwd-"));

  mkdirSync(join(home, ".claude"), { recursive: true });
  mkdirSync(join(home, ".cursor"), { recursive: true });
  writeFileSync(join(home, ".claude", "CLAUDE.md"), "# My rules\n");

  return { home, cwd };
}

test("only agents present on the machine are offered", () => {
  const scope = scaffold();
  const ids = installableTargets(scope).map((target) => target.id);

  assert.deepEqual(ids.sort(), ["claude", "cursor", "project"]);
});

test("dry-run writes nothing", () => {
  const scope = scaffold();
  const results = applyRules({ scope, dryRun: true });

  assert.ok(results.every((entry) => entry.status === "planned"));
  assert.equal(readFileSync(join(scope.home, ".claude", "CLAUDE.md"), "utf8"), "# My rules\n");
});

test("apply writes the block, and a second apply reports it present", () => {
  const scope = scaffold();

  assert.ok(applyRules({ scope }).every((entry) => entry.status === "written"));
  assert.ok(applyRules({ scope }).every((entry) => entry.status === "present"));
  assert.match(readFileSync(join(scope.home, ".claude", "CLAUDE.md"), "utf8"), /rule-mcp-rules/);
});

test("every file install writes is a file uninstall finds", () => {
  const scope = scaffold();
  const written = new Set(applyRules({ scope }).map((entry) => entry.file));
  const removable = new Set(removableTargets(scope).map((target) => target.file));

  assert.deepEqual([...written].sort(), [...removable].sort());
});

test("uninstall restores the original file byte for byte", () => {
  const scope = scaffold();
  const claudeMd = join(scope.home, ".claude", "CLAUDE.md");

  applyRules({ scope });
  removeRules({ scope });

  assert.equal(readFileSync(claudeMd, "utf8"), "# My rules\n");
});

test("a legacy Cursor path left by an older install is still cleaned", () => {
  const scope = scaffold();
  const legacy = join(scope.home, ".cursor", ".cursorrules");

  applyRules({ scope });
  writeFileSync(legacy, readFileSync(join(scope.home, ".cursorrules"), "utf8"));

  const removed = removeRules({ scope }).map((entry) => entry.file);

  assert.ok(removed.includes(legacy), "the legacy path must be swept");
  assert.ok(!readFileSync(legacy, "utf8").includes("rule-mcp-rules"));
});

test("the project CLAUDE.md is created when absent", () => {
  const scope = scaffold();

  applyRules({ scope });

  assert.ok(existsSync(join(scope.cwd, "CLAUDE.md")));
});
