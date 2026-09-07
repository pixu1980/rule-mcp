/**
 * Regression: a targeted shell install must forward the requested mode and
 * must not run a second IDE phase that configures unselected VS Code/JetBrains.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../../..", import.meta.url).pathname;
const output = execFileSync("bash", ["scripts/install.sh", "--agent", "pi", "--mode", "daemon", "--dry-run", "--no-rules"], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, TERM: "dumb", PNPM_HOME: join(tmpdir(), "rule-selection-pnpm") },
});

assert.match(output, /install --agent pi --mode daemon/, "must forward selected mode to CLI");
assert.doesNotMatch(output, /Phase 4: IDE Integration/, "must not run unselected IDE configuration");
assert.doesNotMatch(output, /Configuring VS Code|Configuring JetBrains/, "must not configure unselected IDEs");

console.log("  ✅ targeted shell install respects mode and selected agents only");
