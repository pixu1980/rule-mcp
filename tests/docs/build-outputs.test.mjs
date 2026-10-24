/**
 * @module test/docs/build-outputs
 *
 * A build output stays out of the index.
 *
 * `site-dist/` is what `pnpm docs:build` writes from `README.md` and `docs/`,
 * and `.gitignore` lists it. It was tracked anyway, so every `pnpm docs:dev`
 * rewrote the file and left the working tree dirty, and the committed snapshot
 * advertised surface counts the registry had already left behind (88 skills and
 * 109 tools against 87 and 108). The README carries those numbers and
 * `docs-accuracy.test.mjs` checks it against the live surface, so the generated
 * copy can only disagree with the source it came from.
 */

import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Read-only git, so the check never writes to the repository it audits. */
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });

test("site-dist is not tracked", () => {
  const tracked = git("ls-files", "site-dist")
    .split("\n")
    .filter((line) => line !== "");

  assert.deepEqual(tracked, [], "the generated site is built, not committed; the Pages workflow runs pnpm docs:build");
});

test("the ignore rule that keeps it out is still there", () => {
  const ignored = readFileSync(join(root, ".gitignore"), "utf8")
    .split("\n")
    .map((line) => line.trim());

  assert.ok(ignored.includes("site-dist/"), ".gitignore must keep site-dist/ ignored, or a git add -A re-tracks it");
});
