

/** The persistent tier: the cache's file policy, and the store that owns the IO. */
import { createFileStore } from "../../../shared/ports/index.js";
import { cacheFile, namespace } from "./_config.js";
import { cacheState } from "./_state.js";

/** The entry version this build writes. A file from another version is dropped. */
const ENTRY_VERSION = 3;

/**
 * What goes on disk: the namespace and the version around the entries.
 *
 * @param {Iterable<[string, any]>} entries
 * @returns {object}
 */
function encode(entries) {
  return { namespace: namespace(), version: ENTRY_VERSION, entries: Object.fromEntries(entries) };
}

/**
 * What comes back off disk, entry by entry.
 *
 * A namespace mismatch means the file is stale and none of it is used. Two
 * entry shapes are dropped rather than migrated: one written before entries
 * carried their dependencies (the result sat at the top level), and one whose
 * core carries a request id, which can never match a recompute and would be
 * reported as drift on every verify (ADR 059).
 *
 * @param {object} parsed
 * @returns {Array<[string, any]>}
 */
function decode(parsed) {
  if (parsed?.namespace !== namespace() || !parsed?.entries || typeof parsed.entries !== "object") {
    return [];
  }

  return Object.entries(parsed.entries).filter(([, value]) => value && typeof value === "object" && value.result && value.result?._meta?.pixEnforcement?.requestId === undefined);
}

/** Whether the file-backed store has been installed. */
let installed = false;

/**
 * The entries, with the file tier installed on the first call.
 *
 * A process that never touches the cache never opens the file: the install is
 * what the first read or write does, not what importing this module does.
 *
 * @returns {import("../../../shared/ports/index.js").StorePort}
 */
export function entriesStore() {
  if (!installed) {
    installed = true;
    cacheState.store = createFileStore({ file: cacheFile(), encode, decode });
  }

  return cacheState.store;
}

/**
 * Load the persistent tier into memory.
 *
 * The store loads on its first read, so this exists for the callers that want
 * the cost paid here rather than at their next lookup.
 */
export function ensureLoaded() {
  entriesStore();
}

/** Write the in-memory tier to the gzipped file, if anything changed. */
export function flush() {
  entriesStore().persist();
}
