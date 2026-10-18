

/**
 * @module core/tokensave/insights
 *
 * The read-only TokenSave answers the reporting surfaces quote: the graph's own
 * size, the tests the changed files reach, and the running server's telemetry.
 *
 * Every function returns `null` when there is no graph or the tool refuses, so a
 * caller branches once instead of catching, and a server running without
 * TokenSave keeps its previous behaviour with no extra prose in the output.
 *
 * @see module:core/tokensave/probe - the availability check
 * @see module:core/tokensave/client-sync - the synchronous CLI call
 */

import { callToolSync } from "./_client-sync.js";
import { probeFilesystem } from "./_probe.js";

/** Call one tool and return its payload, or null when it cannot answer. */
function read(projectDir, tool, args, { probe = probeFilesystem, client = callToolSync } = {}) {
  if (!probe(projectDir).available) {
    return null;
  }

  const result = client(tool, args, { projectDir });

  return result.ok ? result.value : null;
}

/**
 * The graph's own size, normalized so a caller never reads TokenSave's field
 * names twice.
 *
 * @param {string} [projectDir]
 * @param {{ probe?: Function, client?: Function }} [options]
 * @returns {{ nodes: number, edges: number, files: number, dbBytes: number, sourceBytes: number, lastUpdated: number|null, languages: object }|null}
 */
export function graphStatus(projectDir = process.cwd(), options = {}) {
  const value = read(projectDir, "status", {}, options);

  if (!value || typeof value !== "object") {
    return null;
  }

  return {
    nodes: Number(value.node_count) || 0,
    edges: Number(value.edge_count) || 0,
    files: Number(value.file_count) || 0,
    dbBytes: Number(value.db_size_bytes) || 0,
    sourceBytes: Number(value.total_source_bytes) || 0,
    lastUpdated: Number(value.last_updated) || null,
    languages: value.files_by_language ?? {},
  };
}

/**
 * The graph's age in seconds, or null when it was never recorded.
 *
 * @param {{ lastUpdated?: number|null }|null} status - from {@link graphStatus}
 * @param {number} [now] - milliseconds, injectable for the test
 * @returns {number|null}
 */
export function graphAgeSeconds(status, now = Date.now()) {
  const updated = status?.lastUpdated;

  return Number.isFinite(updated) && updated > 0 ? Math.max(0, Math.floor(now / 1000) - updated) : null;
}

/**
 * The tests the changed files reach, through the dependency graph.
 *
 * `affected_tests` is the list TokenSave returns; `recommended_tests` is the
 * narrower one it may leave empty, so the wider list is what a report wants.
 *
 * @param {string} [projectDir]
 * @param {string[]} [files] - Changed, project-relative paths
 * @param {{ probe?: Function, client?: Function }} [options]
 * @returns {{ files: string[], tests: string[] }|null}
 */
export function affectedTests(projectDir = process.cwd(), files = [], options = {}) {
  if (files.length === 0) {
    return null;
  }

  const value = read(projectDir, "affected", { files }, options);

  if (!value || typeof value !== "object") {
    return null;
  }

  return { files: value.changed_files ?? files, tests: value.affected_tests ?? [] };
}

/**
 * The running TokenSave server's telemetry: pid, resident memory, CPU and the
 * database files it holds open.
 *
 * @param {string} [projectDir]
 * @param {{ probe?: Function, client?: Function }} [options]
 * @returns {{ version: string, pid: number|null, rssBytes: number, cpuPercent: number, capturedAt: number|null }|null}
 */
export function runtimeSnapshot(projectDir = process.cwd(), options = {}) {
  const value = read(projectDir, "runtime", {}, options);

  if (!value || typeof value !== "object") {
    return null;
  }

  return {
    version: value.tokensave_version ?? "unknown",
    pid: Number(value.process?.pid) || null,
    rssBytes: Number(value.process?.rss_bytes) || 0,
    cpuPercent: Number(value.process?.cpu_percent) || 0,
    capturedAt: Number(value.captured_at) || null,
  };
}

/** A byte count as the report reads it. */
export function formatBytes(bytes) {
  const value = Number(bytes) || 0;

  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} kB`;
  }

  return `${value} B`;
}
