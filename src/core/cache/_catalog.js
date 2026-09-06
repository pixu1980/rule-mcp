/**
 * @module core/cache-catalog
 *
 * The shared half of the cache.
 *
 * `tool-cache.json.gz` is private to one machine: everything, hot, evicted
 * freely. `pix-catalog.json` is the part a team inherits: promoted entries,
 * readable, sorted, and committed to the repository on purpose. Conflating the
 * two is what turns a catalog into a dump, so they are separate files with
 * separate rules.
 *
 * An entry earns its place twice. It has to have been reused (MIN_HITS), and it
 * has to still reproduce: every candidate is recomputed at export time and
 * dropped if the answer has moved. An entry that no longer reproduces was
 * already wrong here, and exporting it would spread it.
 *
 * The machine proposes and a person decides: `cache export` writes the file and
 * somebody commits it.
 *
 * @see module:core/tool-cache - the private tier, and where hits are counted
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cacheEntries, cacheIsFresh, cachePrime, cacheEnabled, promotableEntries } from "./tool-cache/index.js";

export { MIN_HITS } from "./tool-cache/index.js";
import { pkg as package_ } from "../../cli/paths.js";

/** The committed file. One name, so a reader always knows what they are looking at. */
export const CATALOG_FILE = "pix-catalog.json";

/** The format this module writes. Bumped when the shape changes, not the contents. */
export const CATALOG_VERSION = 1;

/**
 * @param {string} [directory] - Project root. Defaults to the working directory.
 * @returns {string} Absolute path of the catalog file.
 */
export function catalogPath(directory = process.cwd()) {
  return join(directory, CATALOG_FILE);
}

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
function namesALocalPath(value) {
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
function compareEntries(left, right) {
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
 *   re-run at all. `pix_tool_gateway` is not a registered cache tool rather than a
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

/**
 * Write the catalog where a person can read and commit it.
 *
 * @param {string} directory
 * @param {object} catalog
 * @returns {string} the path written
 */
export function writeCatalog(directory, catalog) {
  const file = catalogPath(directory);
  writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);

  return file;
}

/**
 * Read the catalog, or nothing when it is absent or unreadable.
 *
 * A corrupt catalog is ignored rather than fatal: it is an optimization, and an
 * optimization that can stop a server from starting is a liability.
 *
 * @param {string} [directory]
 * @returns {object|undefined}
 */
export function readCatalog(directory = process.cwd()) {
  try {
    const file = catalogPath(directory);

    if (!existsSync(file)) {
      return;
    }

    const parsed = JSON.parse(readFileSync(file, "utf8"));

    if (!Array.isArray(parsed?.entries)) {
      return;
    }

    return parsed;
  } catch {
    // A catalog that will not parse is one nobody can use, and it is not worth
    // stopping a server over.
  }
}

/**
 * Load the catalog into the cache, below whatever is already there.
 *
 * Inherited answers enter through the ordinary keys, so a lookup that they
 * answer still reports `exact` or `normalized`. There is no catalog tier: a
 * shared answer is the same answer, and where it came from is a fact about
 * provenance rather than about retrieval.
 *
 * Freshness still applies. An entry recorded the digests it depended on, so one
 * exported before a skill changed is dropped on the read that finds it, exactly
 * like a local entry.
 *
 * @param {string} [directory]
 * @returns {{ loaded: number, skipped: number }}
 */
export function primeFromCatalog(directory = process.cwd()) {
  if (!cacheEnabled()) {
    return { loaded: 0, skipped: 0 };
  }

  const catalog = readCatalog(directory);

  if (!catalog) {
    return { loaded: 0, skipped: 0 };
  }

  let loaded = 0;
  let skipped = 0;

  for (const entry of catalog.entries) {
    if (typeof entry?.tool !== "string" || !entry.result) {
      skipped++;
      continue;
    }

    if (cachePrime(entry.tool, entry.args ?? {}, entry.result, entry.dependsOn ?? {})) {
      loaded++;
    } else {
      skipped++;
    }
  }

  return { loaded, skipped };
}

/**
 * Recompute every entry and report the ones that no longer reproduce.
 *
 * This is the check that keeps the rest trustworthy. A deterministic cache
 * whose determinism nobody verifies is an assumption, and the entries it serves
 * are that assumption applied to somebody's work.
 *
 * @param {object} options
 * @param {(tool: string, args: object) => Promise<object>|object} options.recompute
 * @param {(tool: string) => boolean} [options.canRun]
 * @returns {Promise<{ checked: number, skipped: number, drifted: Array<object>, failed: Array<object> }>}
 */
export async function verifyCache({ recompute, canRun = () => true }) {
  const seen = new Set();
  const drifted = [];
  const failed = [];
  let checked = 0;
  let skipped = 0;

  for (const entry of cacheEntries()) {
    if (entry.tool === undefined) {
      continue;
    }

    if (!canRun(entry.tool)) {
      skipped++;
      continue;
    }

    const identity = `${entry.tool} ${JSON.stringify(entry.args ?? {})}`;

    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);

    // An entry whose skills have moved is already dead: the next lookup evicts
    // it. Reporting it as drift would be reporting invalidation, which is the
    // cache working. Checked without a lookup, because a lookup counts a reuse
    // and verifying is not using.
    if (!cacheIsFresh(entry.tool, entry.args ?? {})) {
      skipped++;
      continue;
    }

    checked++;

    try {
      const fresh = await recompute(entry.tool, entry.args);

      if (JSON.stringify(fresh) !== JSON.stringify(entry.result)) {
        drifted.push({ tool: entry.tool, args: entry.args });
      }
    } catch (error) {
      failed.push({ tool: entry.tool, args: entry.args, error: error.message });
    }
  }

  return { checked, skipped, drifted, failed };
}
