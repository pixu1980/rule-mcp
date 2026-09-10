import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * Every GitHub Action is pinned to a commit SHA (OSS-12).
 *
 * A moving tag lets a compromised or retagged upstream action execute
 * arbitrary code in CI - and in release.yml that code runs with
 * contents: write. Each `uses:` line must name a 40-hex SHA with the
 * tag kept in a trailing comment, so updates stay explicit and
 * reviewable: `uses: actions/checkout@<sha> # v4`.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const workflowsDir = join(root, ".github", "workflows");
const PINNED = /uses:\s*\S+@[0-9a-f]{40}\s+#\s*\S+/u;

test("every uses: line pins a 40-hex SHA with a version comment", () => {
  const files = readdirSync(workflowsDir).filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"));
  const unpinned = [];

  assert.ok(files.length > 0, "no workflow files found");

  for (const name of files) {
    const lines = readFileSync(join(workflowsDir, name), "utf8").split("\n");

    for (const [index, line] of lines.entries()) {
      if (!line.includes("uses:")) {
        continue;
      }

      if (!PINNED.test(line)) {
        unpinned.push(`${name}:${index + 1}: ${line.trim()}`);
      }
    }
  }

  assert.deepEqual(unpinned, [], "a moving tag executes whatever upstream points it at - pin the SHA");
});
