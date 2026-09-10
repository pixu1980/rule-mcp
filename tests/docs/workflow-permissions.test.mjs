import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * Workflows run with the least privilege they need (OSS-13).
 *
 * A workflow-scope `id-token: write` mints OIDC tokens for every job -
 * including lint and the test matrix, which only install dependencies.
 * A checkout that keeps credentials lets a later compromised step push
 * with them. Broad rights belong on the single job that needs them, and
 * `persist-credentials: false` belongs on every checkout.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const workflowsDir = join(root, ".github", "workflows");
const BROAD = /^\s*(id-token|contents|actions):\s*write\s*$/u;

function header(lines) {
  const at = lines.findIndex((line) => /^jobs:\s*$/.test(line));

  return at === -1 ? lines : lines.slice(0, at);
}

test("no workflow grants write scopes above the job level", () => {
  const files = readdirSync(workflowsDir).filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"));
  const broad = [];

  assert.ok(files.length > 0, "no workflow files found");

  for (const name of files) {
    const lines = readFileSync(join(workflowsDir, name), "utf8").split("\n");

    for (const [index, line] of header(lines).entries()) {
      if (BROAD.test(line)) {
        broad.push(`${name}:${index + 1}: ${line.trim()}`);
      }
    }
  }

  assert.deepEqual(broad, [], "move write scopes to the one job that needs them");
});

test("every checkout step drops credentials", () => {
  const files = readdirSync(workflowsDir).filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"));
  const keeping = [];

  for (const name of files) {
    const lines = readFileSync(join(workflowsDir, name), "utf8").split("\n");

    for (const [index, line] of lines.entries()) {
      if (!line.includes("uses:") || !line.includes("actions/checkout@")) {
        continue;
      }

      const window = lines.slice(index, index + 4).join("\n");

      if (!/persist-credentials:\s*false/.test(window)) {
        keeping.push(`${name}:${index + 1}: ${line.trim()}`);
      }
    }
  }

  assert.deepEqual(keeping, [], "a checkout that keeps credentials hands them to every later step");
});
