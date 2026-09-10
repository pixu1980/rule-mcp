/**
 * A broken post-commit hook fails every later commit, so the removal path
 * gets the same scrutiny as the install path.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { hasHook, repairOrphanFi, withHook, withoutHook } from "../_git-hook.js";

/** `sh -n` is the only authority on whether a hook still parses. */
function parses(text) {
  const file = join(mkdtempSync(join(tmpdir(), "rule-hook-")), "post-commit");

  writeFileSync(file, text);

  try {
    execFileSync("sh", ["-n", file], { stdio: "pipe" });

    return true;
  } catch {
    return false;
  }
}

test("a fresh hook gets exactly one shebang", () => {
  const hook = withHook("");

  assert.ok(hook.startsWith("#!/bin/sh\n"));
  assert.equal(hook.split("\n").filter((line) => line.startsWith("#!")).length, 1);
});

test("appending to an existing hook does not add a second shebang", () => {
  const hook = withHook("#!/bin/sh\necho hi\n");

  assert.equal(hook.split("\n").filter((line) => line.startsWith("#!")).length, 1);
});

test("the installed hook is valid shell", () => {
  assert.ok(parses(withHook("")));
  assert.ok(parses(withHook("#!/bin/sh\necho hi\n")));
});

test("install then uninstall restores the original hook", () => {
  const original = "#!/bin/sh\necho hi\n";

  assert.equal(withoutHook(withHook(original)), original);
});

test("the hook still parses after removal", () => {
  assert.ok(parses(withoutHook(withHook("#!/bin/sh\nif true; then\n  echo hi\nfi\n"))));
});

test("an orphan fi left by an older line-wise uninstall is repaired", () => {
  const damaged = "#!/bin/sh\nfi\necho hi\n";

  assert.ok(!parses(damaged), "the damaged hook must actually be broken");
  assert.ok(parses(repairOrphanFi(damaged)));
});

test("repair never touches a hook that balances", () => {
  const balanced = "#!/bin/sh\nif true; then\n  echo hi\nfi\n";

  assert.equal(repairOrphanFi(balanced), balanced);
});

test("hasHook recognizes the sentinel", () => {
  assert.equal(hasHook("#!/bin/sh\n"), false);
  assert.equal(hasHook(withHook("")), true);
});
