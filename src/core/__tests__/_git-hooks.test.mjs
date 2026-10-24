/**
 * @module test/git-hooks.test
 *
 * The marked hook block earlier versions installed is removed without touching
 * anything else in the file. The block existed to re-assert a `.gitignore` rule
 * for a recorder directory written into every observed project; nothing is
 * written into a project any more, so the cleanup is what remains.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { GIT_HOOK_MARKER, HOOKED_GIT_EVENTS, uninstallGitHooks } = await import("../../../src/core/index.js");

function hookTree() {
  const dir = mkdtempSync(join(tmpdir(), "rule-git-hooks-"));
  for (const event of HOOKED_GIT_EVENTS) {
    writeFileSync(join(dir, event), "");
  }

  return dir;
}

/** A hook file carrying our begin/end block around a foreign chain line. */
function foreignChainedHook() {
  return [
    "#!/bin/sh",
    "",
    "# user's own line - keep it",
    "echo hi",
    "",
    `# ${GIT_HOOK_MARKER}: begin`,
    "git config core.hooksPath .git/hooks 2>/dev/null || true",
    `# ${GIT_HOOK_MARKER}: end`,
    "",
    "# foreign plugin line - keep it",
    "pnpm lint --quiet",
    "",
  ].join("\n");
}

test("uninstall removes our block and keeps every other line", () => {
  const dir = hookTree();
  const file = join(dir, "post-checkout");
  writeFileSync(file, foreignChainedHook());

  const result = uninstallGitHooks({ dir });

  assert.deepEqual(result.removed, ["post-checkout"]);
  const kept = readFileSync(file, "utf8");
  assert.ok(!kept.includes(GIT_HOOK_MARKER), "the marked block is gone");
  assert.ok(kept.includes("echo hi"), "the user's own lines survive");
  assert.ok(kept.includes("pnpm lint --quiet"), "foreign lines survive");
  assert.ok(kept.includes("#!/bin/sh"), "the shebang survives");
});

test("the chain block without an end marker is removed up to the blank line", () => {
  const dir = hookTree();
  const file = join(dir, "post-merge");
  writeFileSync(file, ["#!/bin/sh", `# ${GIT_HOOK_MARKER}: chain`, "git config core.hooksPath .git/hooks", "", "echo still-here", ""].join("\n"));

  const result = uninstallGitHooks({ dir });

  assert.deepEqual(result.removed, ["post-merge"]);
  const kept = readFileSync(file, "utf8");
  assert.ok(!kept.includes(GIT_HOOK_MARKER), "the chain block is gone");
  assert.ok(kept.includes("echo still-here"), "everything after the blank line survives");
});

test("a file without our marker is left alone", () => {
  const dir = hookTree();
  const file = join(dir, "post-checkout");
  writeFileSync(file, "#!/bin/sh\necho custom\n");

  const result = uninstallGitHooks({ dir });

  assert.deepEqual(result.removed, []);
  assert.equal(readFileSync(file, "utf8"), "#!/bin/sh\necho custom\n");
});

test("missing hook files are skipped", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-git-hooks-empty-"));
  const result = uninstallGitHooks({ dir });
  assert.deepEqual(result.removed, []);
  rmSync(dir, { recursive: true, force: true });
});

test("the marker has the rule-mcp identity", () => {
  assert.equal(GIT_HOOK_MARKER, "rule-mcp");
  assert.ok(HOOKED_GIT_EVENTS.includes("post-checkout"));
  assert.ok(HOOKED_GIT_EVENTS.includes("post-merge"));
});

test("an unreadable hook file is skipped without a crash", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-git-hooks-broken-"));
  mkdirSync(join(dir, "post-merge"), { recursive: true }); // a directory at the hook path cannot be read
  const result = uninstallGitHooks({ dir });
  assert.deepEqual(result.removed, [], "an unreadable hook is skipped");
  rmSync(dir, { recursive: true, force: true });
});
