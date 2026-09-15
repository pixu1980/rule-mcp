

/**
 * @module core/tokensave/ledger
 *
 * The TokenSave savings ledger, read from its CLI for the stats tool.
 *
 * The ledger is global to the machine, so a failure to read it is a missing
 * number, not an error: the local telemetry the stats tool already reports
 * stands on its own.
 */

import { execFileSync } from "node:child_process";

/** The default window the ledger reports. */
export const DEFAULT_RANGE = "30d";

/** Run the CLI and return its stdout. */
function defaultExec(file, args, options) {
  return execFileSync(file, args, { encoding: "utf8", ...options });
}

/**
 * The TokenSave savings ledger, or null when it cannot be read.
 *
 * @param {string} [projectDir]
 * @param {{ range?: string, exec?: Function }} [options]
 * @returns {{ saved_tokens?: number, calls?: number, usd?: number, range?: string }|null}
 */
export function tokensaveGain(projectDir = process.cwd(), { range = DEFAULT_RANGE, exec = defaultExec } = {}) {
  try {
    return JSON.parse(exec("tokensave", ["gain", "--json", "--range", range], { cwd: projectDir, timeout: 10_000 }));
  } catch {
    return null;
  }
}
