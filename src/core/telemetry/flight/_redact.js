/** @module core/telemetry/flight/redact */

import { basename } from "node:path";
import { hashValue } from "../recorder/_identity.js";

/**
 * Share-safe copy of a flight (hardening 2.1, findings F-P1/F-P3).
 *
 * A local export is complete on purpose - it is the user's recording of their
 * own machine. Sharing one is a different act: prompt text is potentially
 * personal data (and routinely the employer's problem statement), and an
 * absolute path names a person and their disk layout. Both leave; every
 * number stays, so a redacted flight is still comparable with a full one.
 *
 * @param {object} flight - a flight envelope from toFlight
 * @returns {object} a deep copy with text and paths removed
 */
export function redactFlight(flight) {
  const copy = structuredClone(flight);
  copy.redacted = true;

  if (copy.project?.dir) {
    copy.project.dir = basename(copy.project.dir);
  }

  if (Array.isArray(copy.prompts)) {
    for (const prompt of copy.prompts) {
      delete prompt.text;
    }
  }

  const scrubPath = (node) => {
    if (!node || typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        scrubPath(item);
      }

      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === "path" && typeof value === "string") {
        node[key] = hashValue(value);
      } else if (typeof value === "object") {
        scrubPath(value);
      }
    }
  };
  scrubPath(copy.session);
  scrubPath(copy.sessions);
  scrubPath(copy.rollups);

  return copy;
}
