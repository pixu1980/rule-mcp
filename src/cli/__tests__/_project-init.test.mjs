

/**
 * @module test/project-init.test
 *
 * `rule-mcp init`, and the cleanup of what earlier versions installed.
 *
 * The command used to create a directory in the project, add a `.gitignore`
 * rule for it, and install git hooks that re-asserted the rule after every
 * checkout and merge. None of that exists any more: a recording lives under the
 * central projects root, so there is nothing in a repository to ignore and
 * nothing for a hook to defend.
 *
 * What is left to test is the promise that replaced it - init writes nothing
 * into the project - and the removal path, which still has to strip a block
 * from a hook file it shares with tokensave without touching anything else.
 *
 * Ported upstream behavior (ADR 082) with the names rebranded to rule.
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

// `init` records the project it initializes, and homedir() reads HOME, so the
// recording lands in a temporary home instead of the person's own.
process.env.HOME = mkdtempSync(join(tmpdir(), "rule-init-home-"));

const { GIT_HOOK_MARKER, HOOKED_GIT_EVENTS, gitHooksDir, uninstallGitHooks } = await import("../../core/index.js");
const { initProject } = await import("../index.js");
const { getProjectPaths } = await import("../paths/index.js");

const workspace = () => realpathSync(mkdtempSync(join(tmpdir(), "rule-init-")));

test("the hooks directory is git's own, so a removal reaches the file git reads", () => {
  const dir = gitHooksDir();
  assert.ok(typeof dir === "string" && dir.length > 0);
  assert.ok(dir.includes("hooks"), `${dir} does not look like a hooks directory`);
});

test("init writes nothing into the project", () => {
  const project = workspace();
  mkdirSync(join(project, ".git"), { recursive: true });

  const result = initProject({ projectDir: project, tokensave: false });

  assert.equal(existsSync(join(project, ".rule-mcp")), false, "no directory in the repository");
  assert.equal(existsSync(join(project, ".gitignore")), false, "and no ignore rule written for one");
  assert.equal(result.dir, getProjectPaths(project).dir, "it reports the central directory it prepared");
  assert.ok(existsSync(result.dir), "which exists afterwards");
});

test("removal takes our block out of a shared hook and leaves the rest", () => {
  const dir = workspace();

  for (const event of HOOKED_GIT_EVENTS) {
    writeFileSync(
      join(dir, event),
      [
        "#!/bin/sh",
        "# tokensave: begin",
        "tokensave sync >/dev/null 2>&1 &",
        "# tokensave: end",
        `# ${GIT_HOOK_MARKER}: begin`,
        "rule-mcp init >/dev/null 2>&1 &",
        `# ${GIT_HOOK_MARKER}: end`,
        "",
      ].join("\n"),
    );
  }

  const { removed } = uninstallGitHooks({ dir });
  assert.deepEqual(removed.sort(), [...HOOKED_GIT_EVENTS].sort(), "every hook that had our block is cleaned");

  for (const event of HOOKED_GIT_EVENTS) {
    const body = readFileSync(join(dir, event), "utf8");
    assert.doesNotMatch(body, new RegExp(GIT_HOOK_MARKER), "our block is gone");
    assert.match(body, /tokensave sync/, "and tokensave's is untouched");
    assert.match(body, /^#!\/bin\/sh/, "the shebang survives");
  }
});

test("removal is silent when there is nothing of ours to remove", () => {
  const dir = workspace();
  writeFileSync(join(dir, "post-merge"), "#!/bin/sh\ntokensave sync\n");

  const { removed } = uninstallGitHooks({ dir });

  assert.deepEqual(removed, [], "a hook that was never ours is left alone");
  assert.equal(readFileSync(join(dir, "post-merge"), "utf8"), "#!/bin/sh\ntokensave sync\n");
});
