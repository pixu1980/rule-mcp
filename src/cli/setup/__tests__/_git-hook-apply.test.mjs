

/** installGitHook and removeGitHook against throwaway repositories. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";

import { hasHook } from "../_git-hook.js";
import { installGitHook, postCommitPath, removeGitHook } from "../_git-hook-apply.js";

// Hermetic git: a core.hooksPath in the ambient global config would redirect
// postCommitPath out of the fixture repos and into the real machine.
process.env.GIT_CONFIG_GLOBAL = "/dev/null";
process.env.GIT_CONFIG_NOSYSTEM = "1";

/** A git repo at root, with an optional pre-existing hook body. */
function repo(hookBody) {
  const root = mkdtempSync(join(tmpdir(), "rule-githook-apply-"));
  execFileSync("git", ["init", "-q"], { cwd: root });

  if (hookBody !== undefined) {
    const file = postCommitPath(root);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, hookBody);
  }

  return root;
}

test("a repository without a hook plans one on dry run", () => {
  const root = repo();

  try {
    const planned = installGitHook({ cwd: root, dryRun: true });

    assert.equal(planned.status, "planned", "nothing is written on dry run");
    assert.ok(planned.file.endsWith("post-commit"), "the hook path is reported");
    assert.equal(existsSync(planned.file), false, "the dry run writes nothing");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("installing keeps an existing hook body and removing restores it", () => {
  const root = repo("#!/bin/sh\necho before\n");

  try {
    const written = installGitHook({ cwd: root });
    assert.equal(written.status, "written", "the block is written");

    const removed = removeGitHook({ cwd: root });
    assert.equal(removed.status, "removed", "the block is removed again");
    assert.ok(!hasHook(readFileSync(written.file, "utf8")), "the block is gone");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("removing without a hook or repository reports absent and no-repo", () => {
  const fresh = repo();
  const bare = mkdtempSync(join(tmpdir(), "rule-githook-bare-"));

  try {
    assert.equal(removeGitHook({ cwd: fresh }).status, "absent", "no hook file means absent");
    assert.equal(removeGitHook({ cwd: bare }).status, "no-repo", "no repository means no-repo");
    assert.equal(installGitHook({ cwd: bare }).status, "no-repo", "installing needs a repository too");
  } finally {
    rmSync(fresh, { recursive: true, force: true });
    rmSync(bare, { recursive: true, force: true });
  }
});
