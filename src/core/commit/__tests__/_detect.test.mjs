

/**
 * @module test/core/commit/detect
 *
 * Which `core.hooksPath` a project may adopt, and which one belongs to the
 * person rather than the repository.
 *
 * A machine-wide `core.hooksPath` is the user's, not the project's. Adopting it
 * meant an install wrote the gate into a directory every repository on the
 * machine shares, and kept a `.rule-backup` of whatever was already there. The
 * rule the fixtures below pin: only the repository's own setting is a
 * mechanism; a global or system one is ignored and git's own hooks directory is
 * used instead.
 */

import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { installGitGovernance } from "../index.js";
import { makeRepo, remove, run } from "../../git/__tests__/_fixture.mjs";

/** A private global config that sets `core.hooksPath`, as a user's machine would. */
function userHome(hooksDir) {
  const home = mkdtempSync(join(tmpdir(), "rule-user-home-"));
  const config = join(home, "gitconfig");

  writeFileSync(config, `[core]\n\thooksPath = ${hooksDir}\n`);

  return { home, config };
}

/**
 * Run `body` with the machine's global config replaced, then put it back.
 *
 * @param {string} config
 * @param {() => void} body
 */
function withGlobalConfig(config, body) {
  const previous = { global: process.env.GIT_CONFIG_GLOBAL, nosystem: process.env.GIT_CONFIG_NOSYSTEM };

  process.env.GIT_CONFIG_GLOBAL = config;
  process.env.GIT_CONFIG_NOSYSTEM = "1";

  try {
    body();
  } finally {
    process.env.GIT_CONFIG_GLOBAL = previous.global;
    process.env.GIT_CONFIG_NOSYSTEM = previous.nosystem;
  }
}

test("a repository that configures core.hooksPath keeps that directory", () => {
  const root = makeRepo();
  const hooksDir = join(root, "custom-hooks");

  run(root, "config", "--local", "core.hooksPath", hooksDir);

  const governance = installGitGovernance(root, { husky: false });

  assert.equal(governance.mechanism, "hooks-path", "the project's own setting is the mechanism");
  assert.equal(governance.hooksDir, hooksDir, "and it is the target");
  assert.ok(existsSync(join(hooksDir, "commit-msg")), "the gate lands in the directory the project chose");

  remove(root);
});

test("a machine-wide core.hooksPath is never a hook target", () => {
  const root = makeRepo();
  const userHooks = mkdtempSync(join(tmpdir(), "rule-user-hooks-"));
  const { home, config } = userHome(userHooks);

  try {
    withGlobalConfig(config, () => {
      assert.equal(run(root, "config", "--get", "core.hooksPath"), userHooks, "the machine config is global, not local");

      const governance = installGitGovernance(root, { husky: false });

      assert.equal(governance.mechanism, "git", "a global hooks path is not a project mechanism");
      assert.deepEqual(readdirSync(userHooks), [], "nothing is written into the directory every repository shares");
      assert.ok(existsSync(join(root, ".git", "hooks", "commit-msg")), "the gate lands in the repository's own hooks");
      assert.match(readFileSync(join(root, ".git", "hooks", "commit-msg"), "utf8"), /commit-lint/u, "and it is ours");
    });
  } finally {
    rmSync(userHooks, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
    remove(root);
  }
});
