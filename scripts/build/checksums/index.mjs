

/**
 * Publish a checksum for every script an install runs.
 *
 * The install path is `git clone` then `./scripts/install.sh`, so the bytes a
 * user executes come from a clone rather than from a pipe. A published
 * checksum is what turns "the clone looked right" into something checkable:
 * compare before running, and a tampered mirror or a rewritten tag shows up
 * as a mismatch instead of as a successful install (hardening 3.3).
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUTPUT = join(scriptsDir, "SHA256SUMS");

const files = readdirSync(scriptsDir)
  .filter((name) => name.endsWith(".sh") || name.endsWith(".ps1"))
  .sort();

const lines = files.map((name) => {
  const digest = createHash("sha256")
    .update(readFileSync(join(scriptsDir, name)))
    .digest("hex");

  // Paths from the repository root, so `shasum -a 256 -c scripts/SHA256SUMS`
  // works where a user actually stands after cloning.
  return `${digest}  scripts/${name}`;
});

writeFileSync(OUTPUT, `${lines.join("\n")}\n`);
process.stdout.write(`Wrote ${OUTPUT} (${files.length} script(s)).\n`);
