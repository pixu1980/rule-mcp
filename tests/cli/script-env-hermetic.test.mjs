/**
 * Tests that shell out to install.sh / uninstall.sh must sandbox PNPM_HOME.
 *
 * The scripts honor $PNPM_HOME when resolving the global bin directory:
 * install.sh writes the rule-mcp shim there and uninstall.sh deletes it
 * there. A test that spreads process.env leaks the developer's real PNPM_HOME
 * into the child, so running the installer suite silently deleted (or
 * repointed) the real ~/Library/pnpm/bin/rule-mcp shim - the recurring
 * "spawn .../rule-mcp ENOENT" at session start. This gate makes the
 * sandbox a contract: every spawning test names PNPM_HOME explicitly.
 */
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const CLI_DIR = fileURLToPath(new URL(".", import.meta.url));

/** A test spawns the shell scripts when it names them next to a spawn call. */
const SPAWNS_SCRIPT = /(?:install|uninstall)\.sh/;
const SPAWN_CALL = /\b(?:execFileSync|spawnSync|execSync)\s*\(/;

test("every test that runs install.sh or uninstall.sh sandboxes PNPM_HOME", () => {
  const offenders = [];

  /** A split suite may sandbox in its _*.fixture.mjs; the folder counts as one unit. */
  const dirNamesPnpmHome = (dir) =>
    readdirSync(dir, { withFileTypes: true }).some(
      (entry) => entry.isFile() && entry.name.endsWith(".mjs") && readFileSync(join(dir, entry.name), "utf8").includes("PNPM_HOME"),
    );

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".mjs") || entry.name === "script-env-hermetic.test.mjs") {
        continue;
      }

      const source = readFileSync(full, "utf8");

      if (SPAWNS_SCRIPT.test(source) && SPAWN_CALL.test(source) && !source.includes("PNPM_HOME") && !dirNamesPnpmHome(dir)) {
        offenders.push(full.slice(CLI_DIR.length));
      }
    }
  };
  walk(CLI_DIR);

  assert.deepEqual(
    offenders,
    [],
    `these tests spawn the shell scripts with the real PNPM_HOME leaking in - set env.PNPM_HOME to a sandbox dir: ${offenders.join(", ")}`,
  );
});
