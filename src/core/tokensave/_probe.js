

/**
 * @module core/tokensave/probe
 *
 * The cheap, deterministic probe the TokenSave adapter branches on.
 *
 * A project has a code graph when `.tokensave/tokensave.db` exists. The
 * filesystem half (`probeFilesystem`) reads the config and branch metadata
 * without spawning anything; the enriched half (`probeTokensave`) accepts an
 * injected status reader, so the adapter never imports the client and the
 * probe stays testable without a live server.
 *
 * @see module:core/tokensave/client - the status reader the default path uses
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The directory TokenSave writes its database and metadata into. */
export const TOKENSAVE_DIR = ".tokensave";

/** The TokenSave major this adapter is built against. */
export const SUPPORTED_MAJOR = 7;

/**
 * Whether a reported TokenSave version is one this adapter understands.
 *
 * A missing version is accepted (the adapter is optimistic), a different
 * major is refused, because the tool surface can change shape between majors.
 *
 * @param {unknown} version
 * @returns {boolean}
 */
export function versionSupported(version) {
  if (version === null || version === undefined || version === "") {
    return true;
  }

  return Number.parseInt(String(version).split(".", 1)[0], 10) === SUPPORTED_MAJOR;
}

/** Read and parse a JSON file, returning `null` on any failure. */
function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** The branch metadata with the most recent `last_synced_at`, if any. */
function activeFromBranchMeta(meta) {
  if (!meta || typeof meta.branches !== "object" || meta.branches === null) {
    return null;
  }

  let best = null;

  for (const [name, branch] of Object.entries(meta.branches)) {
    const synced = Number(branch?.last_synced_at) || 0;

    if (!best || synced > best.synced) {
      best = { name, parent: branch?.parent ?? null, synced };
    }
  }

  return best;
}

/** Seconds since a unix timestamp, or `null` when the timestamp is unusable. */
function secondsSince(timestamp) {
  const value = Number(timestamp);

  return Number.isFinite(value) && value > 0 ? Math.max(0, Math.floor(Date.now() / 1000) - value) : null;
}

/**
 * Read what the filesystem says about the graph, without spawning TokenSave.
 *
 * @param {string} [projectDir] - Project root (defaults to cwd)
 * @returns {{ available: boolean, dir: string, dbPath: string, version: string|null, branch: string|null, parentBranch: string|null }}
 */
export function probeFilesystem(projectDir = process.cwd()) {
  const dir = join(projectDir, TOKENSAVE_DIR);
  const dbPath = join(dir, "tokensave.db");
  const config = existsSync(dbPath) ? readJson(join(dir, "config.json")) : null;
  const branchMeta = existsSync(dbPath) ? readJson(join(dir, "branch-meta.json")) : null;
  const active = activeFromBranchMeta(branchMeta);
  const version = config?.last_indexed_version ?? null;

  return {
    available: existsSync(dbPath) && versionSupported(version),
    dir,
    dbPath,
    version,
    supported: versionSupported(version),
    branch: active?.name ?? null,
    parentBranch: active?.parent ?? null,
  };
}

/**
 * Enrich the filesystem probe with a live status read.
 *
 * The status reader is injected so this module has no dependency on the
 * client. A failing reader leaves `available` intact and reports
 * `staleSeconds: null`, because a graph that exists but cannot be inspected
 * is still a graph the caller may want to use.
 *
 * @param {string} [projectDir] - Project root (defaults to cwd)
 * @param {{ status?: () => Promise<object> }} [options] - Injected status reader
 * @returns {Promise<object>} the filesystem probe plus `staleSeconds`
 */
export async function probeTokensave(projectDir = process.cwd(), { status } = {}) {
  const base = probeFilesystem(projectDir);

  if (!base.available || typeof status !== "function") {
    return { ...base, staleSeconds: null };
  }

  try {
    const live = await status();

    return {
      ...base,
      version: live?.version ?? base.version,
      branch: live?.active_branch ?? base.branch,
      parentBranch: live?.parent_branch ?? base.parentBranch,
      staleSeconds: secondsSince(live?.last_sync_at),
      staleFiles: live?.stale_files ?? null,
      staleCommits: live?.stale_commits ?? null,
    };
  } catch {
    return { ...base, staleSeconds: null };
  }
}
