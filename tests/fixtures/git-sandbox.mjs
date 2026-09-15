/**
 * @module test/fixtures/git-sandbox
 *
 * A bare upstream plus a working clone that tracks it, for the suites that
 * exercise the self-update engine against real git.
 *
 * Building one costs 746ms: eleven git invocations to init a bare repository,
 * seed a working copy, commit, push and clone it back. Copying one costs 39ms.
 * The three self-update suites asked for eighteen of them, which is thirteen
 * seconds of git doing the same work over and over, so the template is built
 * once per process and every sandbox after the first is a copy of it.
 *
 * A copy has to be re-pointed at its own upstream: `origin` is an absolute
 * path, so without that every sandbox would fetch from, and push to, the one
 * repository they were all copied from.
 */

import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { homedir, tmpdir, userInfo } from "node:os";
import { join } from "node:path";

/** Run git, quietly, and hand back stdout. */
const git = (arguments_, cwd) => execFileSync("git", arguments_, { cwd, stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" });

/** @type {string | undefined} The template every sandbox is copied from. */
let template;

/** Build the template: bare upstream, seed working copy, clone that tracks it. */
function buildTemplate() {
  const base = mkdtempSync(join(tmpdir(), "rule-sandbox-template-"));
  const upstream = join(base, "upstream.git");
  const clone = join(base, "clone");
  const seed = join(base, "seed");

  mkdirSync(upstream);
  git(["init", "--bare", "-b", "main"], upstream);
  mkdirSync(seed);
  git(["init", "-b", "main"], seed);
  git(["config", "user.email", "t@t.t"], seed);
  git(["config", "user.name", "t"], seed);
  mkdirSync(join(seed, "skills", "rule"), { recursive: true });
  writeFileSync(join(seed, "skills", "rule", "SKILL.md"), "v1\n");
  mkdirSync(join(seed, "src"), { recursive: true });
  writeFileSync(join(seed, "src", "server.js"), "// v1\n");
  git(["add", "-A"], seed);
  git(["commit", "-m", "seed"], seed);
  git(["remote", "add", "origin", upstream], seed);
  git(["push", "-u", "origin", "main"], seed);
  git(["clone", upstream, clone], base);
  git(["config", "user.email", "t@t.t"], clone);
  git(["config", "user.name", "t"], clone);

  return base;
}

/**
 * A sandbox of its own: `{ base, upstream, clone, seed }`, all under one
 * temporary directory that the caller is free to delete.
 *
 * The first call builds the template, every later one copies it.
 *
 * @returns {{ base: string, upstream: string, clone: string, seed: string }}
 */
export function clonePair() {
  // Every sandbox is a project, and a project gets a recording under the home
  // directory. homedir() reads HOME while userInfo() reads the passwd entry:
  // equal means nothing was pinned, and the recordings would land in the
  // person's own home. Refusing here is what makes the pin an invariant rather
  // than something a reader has to notice in each suite.
  if (homedir() === userInfo().homedir) {
    throw new Error('git-sandbox: pin a temporary home first - process.env.HOME = mkdtempSync(join(tmpdir(), "prefix-")) - or this sandbox records into the real one');
  }

  template ??= buildTemplate();

  const base = mkdtempSync(join(tmpdir(), "rule-sandbox-"));
  cpSync(template, base, { recursive: true });
  const upstream = join(base, "upstream.git");
  const clone = join(base, "clone");
  const seed = join(base, "seed");
  // Both working copies point at the template's upstream by absolute path.
  git(["remote", "set-url", "origin", upstream], clone);
  git(["remote", "set-url", "origin", upstream], seed);

  return { base, upstream, clone, seed };
}
