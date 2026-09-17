

/**
 * @module cli/commands/reinstall
 *
 * The `reinstall` command: delegate to `scripts/reinstall.sh`, so the CLI, the
 * pnpm script and the shell script can never drift - the purge lives in one
 * file. The handler imports only Node built-ins, which keeps `--help` cheap
 * and lets it survive the node_modules purge it triggers.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** The checkout's script, resolved from this file, never from cwd. */
const SCRIPT = fileURLToPath(new URL("../../../scripts/reinstall.sh", import.meta.url));

/**
 * Run the reinstall script to completion, inheriting stdio.
 *
 * @param {{ script?: string, spawn?: Function, exists?: Function }} [options]
 */
export function reinstallCommand({ script = SCRIPT, spawn = spawnSync, exists = existsSync } = {}) {
  if (!exists(script)) {
    process.stderr.write(`reinstall: ${script} not found - run this from a checkout with the scripts/ directory.\n`);
    process.exitCode = 1;

    return;
  }

  const result = spawn("bash", [script], { stdio: "inherit" });

  if (result.error) {
    process.stderr.write(`reinstall: ${result.error.message}\n`);
    process.exitCode = 1;

    return;
  }

  process.exitCode = result.status ?? 1;
}
