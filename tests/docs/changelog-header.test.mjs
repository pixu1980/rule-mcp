import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * Generated-document headers must name files that exist (OSS-20).
 *
 * The CHANGELOG header once pointed at scripts/build-changelog.mjs and
 * claimed the release workflow regenerates the file, while release.yml
 * only reads it. A header that names a missing script sends the next
 * editor down a path that is not on disk.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO_PATH = /`((?:scripts|src|tests|docs|bin)\/[^`]*?)`/gu;

function headerPaths(document, lines) {
  const text = readFileSync(join(root, document), "utf8").split("\n").slice(0, lines).join("\n");
  const paths = [];

  for (const match of text.matchAll(REPO_PATH)) {
    paths.push(match[1]);
  }

  return [...new Set(paths)];
}

test("every repository path named in the CHANGELOG header exists", () => {
  const missing = headerPaths("CHANGELOG.md", 8).filter((file) => !existsSync(join(root, file)));

  assert.deepEqual(missing, [], "the header must name the script that actually generates this file");
});
