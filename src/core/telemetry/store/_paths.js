/** @module core/telemetry/store/paths */

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { getProjectPaths } from "../../../cli/paths/index.js";

/** @returns {string} path of the raw event log */
export function eventsFile() {
  return join(getProjectPaths().dir, "telemetry.jsonl");
}

/** @returns {string} path of the daily aggregate file */
export function rollupFile() {
  return join(getProjectPaths().dir, "telemetry-rollup.json");
}

/** @returns {string} path of the per-project id */
export function projectIdFile() {
  return join(getProjectPaths().dir, "project-id");
}

/** @returns {string} path of the usage an agent declared for itself */
export function usageFile() {
  return join(getProjectPaths().dir, "usage.json");
}

/** Ensure the project directory exists. Returns false when it cannot be created. */
export function ensureDirectory() {
  try {
    const { dir } = getProjectPaths();

    mkdirSync(dir, { recursive: true });

    return true;
  } catch {
    return false;
  }
}
