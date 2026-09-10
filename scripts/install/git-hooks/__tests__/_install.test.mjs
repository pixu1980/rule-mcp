/**
 * The hook installer: what it writes, where it refuses to write, and what it
 * leaves alone.
 *
 * The "where" is the part with teeth. `git rev-parse --git-path hooks` looks
 * like the right question and resolves `core.hooksPath`, so on a machine with
 * a global hooks directory it answers with the user's - and installing there
 * replaces hooks that belong to every repository they own. The installer asks
 * for the git directory instead, and refuses any target outside it.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const INSTALLER = new URL("../index.mjs", import.meta.url).pathname;
const TRACKED = new URL("../../../../.githooks", import.meta.url).pathname;

/** A clone with this repository's tracked hooks and a global hooks path set. */
function clone({ globalHooks = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "rule-hooks-"));
  execFileSync("git", ["init", "--quiet", "--initial-branch=main"], { cwd: root });
  mkdirSync(join(root, ".githooks"), { recursive: true });

  for (const name of readdirSync(TRACKED)) {
    const path = join(root, ".githooks", name);
    writeFileSync(path, readFileSync(join(TRACKED, name), "utf8"));
    chmodSync(path, 0o755);
  }

  if (globalHooks) {
    const elsewhere = join(root, "global-hooks");
    mkdirSync(elsewhere, { recursive: true });
    writeFileSync(join(elsewhere, "pre-commit"), "#!/bin/sh\n# the user's own, for every repository\n");
    execFileSync("git", ["config", "core.hooksPath", elsewhere], { cwd: root });
  }

  return root;
}

/** Run the installer against a clone, as a subprocess, the way a script runs. */
function install(root, args = []) {
  const result = execFileSync(process.execPath, [INSTALLER, ...args], { cwd: root, encoding: "utf8" });

  return result.trim();
}

test("every tracked hook gets a shim that executes it", (t) => {
  const root = clone();
  t.after(() => rmSync(root, { recursive: true, force: true }));

  install(root);

  for (const name of readdirSync(join(root, ".githooks"))) {
    const installed = readFileSync(join(root, ".git", "hooks", name), "utf8");

    assert.match(installed, /^#!\/bin\/sh/, `${name} is a shell script`);
    assert.match(installed, new RegExp(`\\.githooks/${name}`), `${name} points at the tracked hook`);
    assert.doesNotMatch(installed, /census|conventional commit/, `${name} carries no logic of its own`);
  }
});

test("a second run changes nothing", (t) => {
  const root = clone();
  t.after(() => rmSync(root, { recursive: true, force: true }));

  install(root);
  const after = install(root);

  assert.match(after, /already current/);
});

test("--check fails before the install and passes after it", (t) => {
  const root = clone();
  t.after(() => rmSync(root, { recursive: true, force: true }));

  assert.throws(() => install(root, ["--check"]), /Command failed/, "an uninstalled clone is reported");
  install(root);
  assert.match(install(root, ["--check"]), /installed and current/);
});

test("a hook someone wrote by hand is kept beside the shim", (t) => {
  const root = clone();
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const path = join(root, ".git", "hooks", "pre-commit");
  mkdirSync(join(root, ".git", "hooks"), { recursive: true });
  writeFileSync(path, "#!/bin/sh\necho mine\n");

  install(root);

  assert.match(readFileSync(path, "utf8"), /\.githooks\/pre-commit/, "the shim is installed");
  assert.equal(readFileSync(`${path}.bak`, "utf8"), "#!/bin/sh\necho mine\n", "and the previous hook is kept");
});

test("a global core.hooksPath is never written to", (t) => {
  const root = clone({ globalHooks: true });
  t.after(() => rmSync(root, { recursive: true, force: true }));

  install(root);

  const global = join(root, "global-hooks", "pre-commit");
  assert.equal(readFileSync(global, "utf8"), "#!/bin/sh\n# the user's own, for every repository\n", "the user's global hook is untouched");
  assert.equal(existsSync(`${global}.bak`), false, "and nothing was backed up over it");
  assert.match(readFileSync(join(root, ".git", "hooks", "pre-commit"), "utf8"), /\.githooks\/pre-commit/, "the clone got the shim instead");
});
