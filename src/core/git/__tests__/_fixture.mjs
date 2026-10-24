

/**
 * @module test/core/git/fixture
 *
 * Hermetic git fixtures for the shared git foundation.
 *
 * Every fixture repository is created under a temp directory with the private
 * global config `tests/fixtures/git-hermetic.mjs` installs, so an ambient
 * `core.hooksPath`, `commit.gpgsign` or `init.defaultBranch` on the machine
 * cannot reach it. The repository hooks this project installs (`commit-msg`
 * rejects a scope-less subject) would otherwise fail the fixture commits
 * themselves.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import "../../../../tests/fixtures/git-hermetic.mjs";

/**
 * Run git in a fixture repository and return trimmed stdout.
 *
 * @param {string} cwd
 * @param {string[]} args
 * @returns {string}
 */
export function run(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

/**
 * A repository on `main` with one commit, ready to branch from.
 *
 * @param {{ branch?: string, seed?: boolean }} [options]
 * @returns {string} the repository root
 */
export function makeRepo({ branch = "main", seed = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-git-"));

  run(root, "init", `--initial-branch=${branch}`, "-q");
  run(root, "config", "user.email", "fixture@example.com");
  run(root, "config", "user.name", "fixture");
  run(root, "config", "commit.gpgsign", "false");

  if (seed) {
    commit(root, "seed.txt", "seed\n", "chore(seed): initial commit");
  }

  return root;
}

/**
 * Write a file, stage it and commit it.
 *
 * @param {string} root
 * @param {string} file
 * @param {string} body
 * @param {string} message
 * @returns {string} the new commit sha
 */
export function commit(root, file, body, message) {
  writeFileSync(join(root, file), body);
  run(root, "add", "-A");
  run(root, "commit", "-q", "-m", message);

  return run(root, "rev-parse", "HEAD");
}

/**
 * Write a file without staging it.
 *
 * @param {string} root @param {string} file @param {string} body
 */
export function write(root, file, body) {
  mkdirSync(join(root, file, ".."), { recursive: true });
  writeFileSync(join(root, file), body);
}

/**
 * Add a bare remote, push the current branch, and point `origin/HEAD` at it.
 *
 * @param {string} root
 * @param {string} [branch]
 * @returns {string} the bare remote path
 */
export function addRemote(root, branch = "main") {
  const remote = mkdtempSync(join(tmpdir(), "rule-mcp-git-remote-"));
  run(remote, "init", "--bare", "-q");
  run(root, "remote", "add", "origin", remote);
  run(root, "push", "-q", "origin", branch);
  run(root, "fetch", "-q", "origin");
  run(root, "symbolic-ref", `refs/remotes/origin/HEAD`, `refs/remotes/origin/${branch}`);

  return remote;
}

/**
 * Delete a fixture repository and its temp home.
 *
 * @param {string} root
 */
export function remove(root) {
  rmSync(root, { recursive: true, force: true });
}
