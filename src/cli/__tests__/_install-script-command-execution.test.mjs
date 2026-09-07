/** Regression: shell installer must execute the CLI with an argv-safe wrapper. */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const script = readFileSync("scripts/install.sh", "utf8");
assert.match(script, /run_cli\(\) \{/, "installer must define an argv-safe CLI wrapper");
assert.doesNotMatch(script, /eval "\$\{BIN_CMD\}/, "installer must not eval command strings");
assert.match(script, /run_cli install --agent "\$\{TARGET_AGENT\}" --mode "\$\{INSTALL_MODE\}" --json/);
assert.match(script, /run_cli daemon install/);
assert.match(script, /run_cli doctor/);

console.log("  ✅ shell installer uses argv-safe CLI execution");
