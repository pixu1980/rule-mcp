/**
 * reinstall.sh: purge, install, refresh the global bin - in that order.
 *
 * The script runs from the checkout it lives in, so every test copies it into
 * a scratch tree with a fake `pnpm` on PATH: a test never touches the real
 * node_modules. The fake records the calls instead of installing anything.
 */
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const root = new URL("../../..", import.meta.url).pathname;
const script = join(root, "scripts", "reinstall.sh");

/** A scratch checkout with the script, a fake pnpm, and leftovers to purge. */
function scratch() {
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-reinstall-"));
  const bin = join(dir, "bin");
  const log = join(dir, "pnpm.log");
  mkdirSync(bin, { recursive: true });
  mkdirSync(join(dir, "scripts"), { recursive: true });
  mkdirSync(join(dir, "node_modules", "dep"), { recursive: true });
  writeFileSync(join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  writeFileSync(join(dir, "package.json"), "{}\n");
  cpSync(script, join(dir, "scripts", "reinstall.sh"));
  writeFileSync(join(bin, "pnpm"), `#!/bin/sh\nprintf '%s\\n' "$*" >> ${JSON.stringify(log)}\n`);
  chmodSync(join(bin, "pnpm"), 0o755);

  return { dir, bin, log };
}

const run = (dir, bin, args = []) =>
  spawnSync("bash", [join(dir, "scripts", "reinstall.sh"), ...args], {
    env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ""}` },
    encoding: "utf8",
  });

test("reinstall.sh purges node_modules and the lockfile", () => {
  const { dir, bin } = scratch();
  const result = run(dir, bin);

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(existsSync(join(dir, "node_modules")), false, "node_modules is purged");
  assert.equal(existsSync(join(dir, "pnpm-lock.yaml")), false, "the lockfile is purged");
  rmSync(dir, { recursive: true, force: true });
});

test("reinstall.sh --keep-lock keeps the lockfile", () => {
  const { dir, bin } = scratch();
  const result = run(dir, bin, ["--keep-lock"]);

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(existsSync(join(dir, "node_modules")), false, "node_modules is purged");
  assert.equal(existsSync(join(dir, "pnpm-lock.yaml")), true, "the lockfile survives");
  rmSync(dir, { recursive: true, force: true });
});

test("reinstall.sh installs, then refreshes the global bin - in that order", () => {
  const { dir, bin, log } = scratch();
  const result = run(dir, bin);

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(readFileSync(log, "utf8").trim().split("\n"), ["install", "install -g ."], "install runs before the global link");
  rmSync(dir, { recursive: true, force: true });
});

test("reinstall.sh refuses a directory that is not a checkout", () => {
  const { dir, bin } = scratch();
  rmSync(join(dir, "package.json"), { force: true });

  const result = run(dir, bin);

  assert.notEqual(result.status, 0, "no package.json means no purge");
  assert.equal(existsSync(join(dir, "node_modules")), true, "and node_modules survives the refusal");
  rmSync(dir, { recursive: true, force: true });
});

test("package.json exposes the setup script that reinstalls and runs the wizard", () => {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

  assert.match(manifest.scripts?.setup ?? "", /scripts\/reinstall\.sh/, "pnpm setup invokes the shell script");
  assert.match(manifest.scripts?.setup ?? "", /rule-mcp\.js setup/, "and then the wizard");
  assert.equal(manifest.scripts?.reinstall, undefined, "the old name is gone");
});
