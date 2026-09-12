/**
 * @module core/layers/sources
 *
 * Where a skill or a persona can come from, in the order they resolve
 * (ADR 079).
 *
 * Three layers, read native first and user last, so the last one read wins:
 * the machine owner overrides the repository, and the repository overrides
 * what this server ships. An entry carries the layer it came from, because a
 * rule nobody can attribute is a rule nobody can debug.
 *
 * This computes paths and nothing else - it never touches the directories it
 * names - so the order is a property of the code rather than of the machine.
 */

import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { findProjectRoot, getRuntimePaths } from "../../cli/paths/index.js";

/** The layers, in resolution order: the last one that defines an id wins. */
export const LAYERS = ["native", "project", "user"];

/** The kinds of thing that resolve through layers, and their directory name. */
const KINDS = new Set(["skills", "personas"]);

/** Where this server's own bundled copy of a kind lives. */
function nativeDir(kind) {
  // fileURLToPath handles Windows drive letters and percent-encoding; a URL
  // pathname would keep "%20" and a leading slash on non-POSIX platforms.
  return fileURLToPath(new URL(`../../../${kind}`, import.meta.url));
}

/**
 * The three layer directories for a kind, in resolution order.
 *
 * @param {"skills"|"personas"} kind
 * @param {{ cwd?: string }} [options] - where to start looking for the project
 * @returns {Array<{ layer: string, dir: string }>}
 */
export function layerSources(kind, { cwd = process.cwd() } = {}) {
  if (!KINDS.has(kind)) {
    throw new Error(`Unknown layer kind "${kind}". Layered kinds: ${[...KINDS].join(", ")}.`);
  }

  const { homeDir } = getRuntimePaths();

  return [
    { layer: "native", dir: nativeDir(kind) },
    { layer: "project", dir: join(findProjectRoot(cwd), ".rule-mcp", kind) },
    { layer: "user", dir: join(homeDir, kind) },
  ];
}
