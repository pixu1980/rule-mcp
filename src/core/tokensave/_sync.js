

/**
 * @module core/tokensave/sync
 *
 * The write-side counterpart of the adapter: after rule changes files, the graph
 * that answers every other call is stale until TokenSave is told.
 *
 * `tokensave sync` is incremental and is the command TokenSave's own git hooks
 * run, so this module adds the one event those hooks cannot see - a write made
 * through `rule_tool_apply` or `rule_tool_fix`. It never throws: a stale index is
 * a degraded read, not a failed write, and a missing binary must not fail a
 * successful edit.
 *
 * @see module:core/tokensave/probe - the availability check
 */

import { execFileSync } from "node:child_process";

import { reasonOf } from "./_client.js";
import { probeFilesystem } from "./_probe.js";

/** Default wall clock for one incremental sync. */
export const DEFAULT_SYNC_TIMEOUT_MS = 120_000;

/**
 * Sync the graph after a write, when there is a graph to sync.
 *
 * @param {string} [projectDir] - Project root
 * @param {{ probe?: Function, exec?: Function, timeoutMs?: number }} [options]
 * @returns {{ synced: boolean, reason?: string }}
 */
export function syncIndex(projectDir = process.cwd(), { probe = probeFilesystem, exec = execFileSync, timeoutMs = DEFAULT_SYNC_TIMEOUT_MS } = {}) {
  if (process.env.RULE_MCP_NO_TOKENSAVE === "1" || !probe(projectDir).available) {
    return { synced: false, reason: "unavailable" };
  }

  try {
    exec("tokensave", ["sync"], { cwd: projectDir, timeout: timeoutMs, stdio: "ignore" });

    return { synced: true };
  } catch (error) {
    return { synced: false, reason: reasonOf(error).split("\n", 1)[0] };
  }
}
