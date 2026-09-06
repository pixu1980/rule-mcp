/** @module core/cache/catalog/build - which entries earn promotion, and the export shape */

import { pkg as package_ } from "../../../cli/paths.js";
import { promotableEntries } from "../tool-cache/index.js";
import { CATALOG_VERSION } from "./_io.js";

/**
 * Markers of a path that belongs to one machine.
 *
 * The catalog is committed, so an absolute path in it is both useless to the
 * next reader and a small leak of whoever exported it. Rather than scrubbing a
 * value and hoping, an entry carrying one is not exported at all.
 */
const LOCAL_PATH = /^[/~]|^[A-Za-z]:[/\\]|\/(?:Users|home)\/|[A-Za-z]:\\Users\\/;

/**
 * Does any argument of this call name a place on this machine?
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function namesALocalPath(value) {
  if (typeof value === "string") {
    return LOCAL_PATH.test(value);
  }

  if (Array.isArray(value)) {
    return value.some((item) => namesALocalPath(item));
  }

  if (value && typeof value === "object") {
    return Object.values(value).some((item) => namesALocalPath(item));
  }

  return false;
}

/** Stable ordering, so a diff shows a change rather than a reshuffle. */
export function compareEntries(left, right) {
  const byTool = left.tool.localeCompare(right.tool);

  return byTool === 0 ? JSON.stringify(left.args).localeCompare(JSON.stringify(right.args)) : byTool;
}

/**
 * Build the catalog from the entries this machine has earned.
 *
 * @param {object} options
 * @param {(tool: string, args: object) => Promise<object>|object} options.recompute
 *   Runs the call again, bypassing the cache. This is the stability check, so a
 *   recompute that consults the cache would verify nothing.
 * @param {string} [options.now] - The date to stamp, injectable so the output is
 *   reproducible.
 * @param {(tool: string) => boolean} [options.canRun] - Whether this tool can be
 *   re-run at all. `rule_tool_gateway` is not a registered cache tool rather than a
 *   registered tool, so it is skipped rather than reported as broken.
 * @returns {Promise<{ catalog: object, promoted: Array<object>, dropped: Array<object> }>}
 */
export async function buildCatalog({ recompute, canRun = () => true, now = new Date().toISOString().slice(0, 10) }) {
  const promoted = [];
  const dropped = [];

  for (const entry of promotableEntries().sort(compareEntries)) {
    if (!canRun(entry.tool)) {
      dropped.push({ tool: entry.tool, args: entry.args, reason: "not-runnable" });
      continue;
    }

    if (namesALocalPath(entry.args)) {
      dropped.push({ tool: entry.tool, args: entry.args, reason: "local-path" });
      continue;
    }

    let fresh;

    try {
      fresh = await recompute(entry.tool, entry.args);
    } catch {
      dropped.push({ tool: entry.tool, args: entry.args, reason: "failed" });
      continue;
    }

    if (JSON.stringify(fresh) !== JSON.stringify(entry.result)) {
      dropped.push({ tool: entry.tool, args: entry.args, reason: "unstable" });
      continue;
    }

    promoted.push({
      tool: entry.tool,
      args: entry.args,
      dependsOn: entry.deps,
      hits: entry.hits,
      result: entry.result,
    });
  }

  return {
    catalog: {
      version: CATALOG_VERSION,
      generatedAt: now,
      serverVersion: package_.version,
      entries: promoted,
    },
    promoted,
    dropped,
  };
}
