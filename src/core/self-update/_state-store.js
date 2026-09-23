

/** Persists the last self-update check across restarts, through the shared file-store port. */
import { join } from "node:path";
import { getRuntimePaths } from "../../cli/paths/index.js";
import { createFileStore } from "../../shared/ports/index.js";

const KEY = "last-check";

let store = null;

/** @returns {string} */
function stateFile() {
  return join(getRuntimePaths().stateDir, "self-update.json.gz");
}

/** The file-backed store, created on first use so importing this module opens no file. */
function stateStore() {
  if (!store) {
    store = createFileStore({
      file: stateFile(),
      encode: (entries) => Object.fromEntries(entries),
      decode: (parsed) => Object.entries(parsed && typeof parsed === "object" ? parsed : {}),
    });
  }

  return store;
}

/**
 * The last persisted check: when it ran, and what it decided.
 *
 * @returns {{ lastCheckAt: number, checked: boolean, updated: boolean, reason?: string }|undefined}
 */
export function loadLastCheck() {
  return stateStore().get(KEY);
}

/**
 * Persist this check's timestamp and outcome so a restart can read it back
 * instead of starting the throttle window over at zero.
 *
 * @param {{ lastCheckAt: number, checked: boolean, updated: boolean, reason?: string }} record
 */
export function saveLastCheck(record) {
  stateStore().set(KEY, record);
}
