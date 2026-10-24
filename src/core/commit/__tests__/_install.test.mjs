

/** WS3.1 - idempotent git governance: detect, install, integrate, preserve. */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { BACKUP_SUFFIX, HOOK_MARKER, detectGovernance, detectPackageManager, installGitGovernance } from "../index.js";
import { makeRepo, remove } from "../../git/__tests__/_fixture.mjs";

test("a project that is not a git repository is left alone", () => {
  const root = makeRepo();
  const governance = installGitGovernance("/nonexistent-rule-mcp-path");

  assert.equal(governance.mechanism, "none", "no repository is no mechanism");
  assert.deepEqual(governance.hooks, {}, "and no hook is written");
  remove(root);
});

test("the package manager is read from the lockfile", () => {
  const root = makeRepo();

  writeFileSync(join(root, "package.json"), "{}\n");

  assert.equal(detectPackageManager(root), "npm", "a package.json without a lockfile keeps npm");

  writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");

  assert.equal(detectPackageManager(root), "pnpm", "the pnpm lockfile decides");

  assert.equal(detectPackageManager("/nonexistent-rule-mcp-path"), null, "no package is no manager");
  remove(root);
});

test("a plain repository gets hooks in git's own hooks directory, idempotently", () => {
  const root = makeRepo();
  const first = installGitGovernance(root);

  assert.equal(first.mechanism, "git", "the default mechanism is git's own hooks");
  assert.equal(first.hooks["commit-msg"], "installed", "the commit-msg gate is installed");
  assert.equal(first.hooks["pre-push"], "installed", "the pre-push gate is installed");
  assert.match(readFileSync(join(first.hooksDir, "commit-msg"), "utf8"), new RegExp(HOOK_MARKER, "u"), "the file is ours");

  const second = installGitGovernance(root);

  assert.equal(second.hooks["commit-msg"], "preserved", "a second run changes nothing");
  assert.equal(second.hooks["pre-push"], "preserved", "for either hook");
  remove(root);
});

test("a tracked .githooks directory is the mechanism when present", () => {
  const root = makeRepo();

  mkdirSync(join(root, ".githooks"));

  const governance = installGitGovernance(root);

  assert.equal(governance.mechanism, "githooks", "the tracked hooks directory is used");
  assert.equal(governance.hooksDir, join(root, ".githooks"), "and is the hook target");
  assert.ok(existsSync(join(root, ".githooks", "commit-msg")), "the gate lands there");
  remove(root);
});

test("an existing Husky setup is integrated, not replaced", () => {
  const root = makeRepo();

  mkdirSync(join(root, ".husky"));

  const governance = installGitGovernance(root);

  assert.equal(governance.mechanism, "husky", "Husky is detected");
  assert.ok(existsSync(join(root, ".husky", "commit-msg")), "the gate lands in .husky/");
  remove(root);
});

test("a foreign hook is kept beside ours and chained", () => {
  const root = makeRepo();
  const hooksDir = join(root, ".git", "hooks");

  mkdirSync(hooksDir, { recursive: true });
  writeFileSync(join(hooksDir, "commit-msg"), "#!/bin/sh\necho foreign\n");

  const governance = installGitGovernance(root, { husky: false });
  const backup = readFileSync(join(hooksDir, `commit-msg${BACKUP_SUFFIX}`), "utf8");
  const written = readFileSync(join(hooksDir, "commit-msg"), "utf8");

  assert.equal(governance.hooks["commit-msg"], "integrated", "a foreign hook is integrated");
  assert.match(backup, /echo foreign/u, "the foreign hook is preserved verbatim");
  assert.match(written, /"\$backup" "\$@"/u, "and is chained from the end of ours");
  remove(root);
});

test("a Node project with no governance gets Husky, without touching the network", () => {
  const root = makeRepo();

  writeFileSync(join(root, "package.json"), `${JSON.stringify({ name: "fixture", version: "1.0.0" }, null, 2)}\n`);
  writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");

  const calls = [];
  const run = (command, args) => calls.push([command, ...args]);
  const governance = installGitGovernance(root, { run });

  assert.equal(governance.mechanism, "husky", "Husky is chosen for a Node project");
  assert.deepEqual(calls[0], ["pnpm", "add", "-D", "husky"], "the dependency is added with the project's manager");
  assert.deepEqual(calls[1], ["pnpm", "exec", "husky"], "and Husky is activated");
  assert.equal(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts.prepare, "husky", "the prepare script is added");
  assert.ok(existsSync(join(root, ".husky", "pre-push")), "the gate lands in .husky/");
  remove(root);
});

test("an existing prepare script is never overwritten", () => {
  const root = makeRepo();

  writeFileSync(join(root, "package.json"), `${JSON.stringify({ name: "fixture", version: "1.0.0", scripts: { prepare: "node scripts/prepare.mjs" } }, null, 2)}\n`);
  writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");

  installGitGovernance(root, { run: () => {} });

  assert.equal(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts.prepare, "node scripts/prepare.mjs", "the project's own prepare script is preserved");
  remove(root);
});

test("detectGovernance reports the mechanism and its directory", () => {
  const root = makeRepo();
  const detected = detectGovernance(root);

  assert.equal(detected.mechanism, "git", "a plain repo uses git's hooks");
  assert.equal(detected.husky, false, "and has no Husky configured");

  mkdirSync(join(root, "node_modules"));

  const nested = detectGovernance(join(root, "node_modules"));

  assert.notEqual(nested.mechanism, "none", "an empty directory inside a repository is still inside it");
  remove(root);
});
