

/** @module core/telemetry/recorder/identity */

import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getRuntimePaths } from "../../../cli/paths/index.js";
import { projectIdFile } from "../store/index.js";

let _installation;
let _project;

/**
 * A random id for THIS project's current recording window.
 *
 * Distinct from the installation id: that one groups a machine across projects
 * and survives everything, while this one is reset by the export that carried
 * it away, so two exports of the same repository are never confused for one
 * continuous recording.
 *
 * @returns {string}
 */
export function projectId() {
  if (_project) {
    return _project;
  }

  const file = projectIdFile();

  try {
    if (existsSync(file)) {
      _project = readFileSync(file, "utf8").trim();

      if (_project) {
        return _project;
      }
    }

    _project = randomUUID();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, _project);
  } catch {
    _project ||= randomUUID();
  }

  return _project;
}

/** Forget the cached project id, so the next call reads or creates a new one. */
export function resetProjectId() {
  _project = undefined;
}

/**
 * A stable, random id for this installation. Not derived from anything about
 * the machine or the user: it exists to group this install's own numbers, and
 * a derived id would be a fingerprint.
 *
 * @returns {string}
 */
export function installationId() {
  if (_installation) {
    return _installation;
  }

  const file = join(getRuntimePaths().stateDir, "installation-id");

  try {
    if (existsSync(file)) {
      _installation = readFileSync(file, "utf8").trim();

      if (_installation) {
        return _installation;
      }
    }

    _installation = randomUUID();
    mkdirSync(getRuntimePaths().stateDir, { recursive: true });
    writeFileSync(file, _installation);
  } catch {
    _installation ||= randomUUID();
  }

  return _installation;
}

/**
 * Hash a value for grouping without revealing it. Truncated to 16 hex
 * characters: enough to distinguish repositories, useless for reversing one.
 *
 * @param {string} value
 * @returns {string}
 */
export function hashValue(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}
