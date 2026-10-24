/** @module core/telemetry/store/sidecar */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ensureDirectory, usageFile } from "./_paths.js";

/**
 * Store the usage an agent reported about itself.
 *
 * The escape hatch for agents whose transcripts this server cannot read. It is
 * stamped `sidecar` so it can never be mistaken for a figure read off disk:
 * a declaration is as trustworthy as whoever made it, and a benchmark has to
 * say which of its numbers were measured.
 *
 * @param {object} usage
 * @returns {boolean} whether it was stored
 */
export function writeSidecarUsage(usage) {
  if (!usage || typeof usage !== "object" || !ensureDirectory()) {
    return false;
  }

  try {
    writeFileSync(usageFile(), JSON.stringify({ ...usage, source: "sidecar" }, undefined, 2));

    return true;
  } catch {
    return false;
  }
}

/** @returns {object|undefined} the declared usage, if there is one */
export function readSidecarUsage() {
  try {
    if (!existsSync(usageFile())) {
      return;
    }

    const parsed = JSON.parse(readFileSync(usageFile(), "utf8"));

    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return;
  }
}
