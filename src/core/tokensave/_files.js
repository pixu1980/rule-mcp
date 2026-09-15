

/**
 * @module core/tokensave/files
 *
 * The file-listing provider the read-only consumers use: prefer the TokenSave
 * `files` tool, fall back to a synchronous directory walk.
 *
 * The provider returns project-relative, forward-slash paths and a `source`
 * label, because callers that were already synchronous keep that shape. The
 * probe and the client are injectable so the provider is testable without a
 * graph or a binary.
 *
 * @see module:core/tokensave/probe - the availability check
 * @see module:core/tokensave/client-sync - the synchronous CLI call
 */

import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { callToolSync } from "./_client-sync.js";
import { probeFilesystem } from "./_probe.js";

/** Strip the `(N symbols, M bytes)` suffix a `tokensave files` line carries. */
const SUFFIX_RE = /\s+\(\d+ symbols?,[^)]*\)\s*$/;

/**
 * Parse the flat `tokensave files` listing into project-relative paths.
 *
 * @param {unknown} text - The tool's text payload
 * @returns {string[]}
 */
export function parseFlatFileList(text) {
  if (typeof text !== "string") {
    return [];
  }

  return text
    .split("\n")
    .map((line) => line.replace(SUFFIX_RE, "").trim())
    .filter(Boolean);
}

/**
 * Walk a directory and return project-relative, forward-slash file paths.
 *
 * @param {string} projectDir - Project root
 * @param {string} [path="."] - Sub-path to walk
 * @returns {string[]}
 */
export function walkFiles(projectDir, path = ".") {
  const out = [];

  /** Depth-first walk of one directory. */
  const visit = (dir) => {
    let entries;

    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = join(dir, entry.name);

      if (entry.isDirectory()) {
        visit(full);
      } else if (entry.isFile()) {
        out.push(relative(projectDir, full).split(sep).join("/"));
      }
    }
  };

  visit(join(projectDir, path));

  return out;
}

/**
 * List the files under `path`, preferring TokenSave.
 *
 * `union` merges the TokenSave listing with a live walk, which is the safe
 * choice for correctness-critical callers: an index synced a moment ago does
 * not know a file just written, and a missing ADR is a wrong handoff.
 *
 * @param {string} projectDir - Project root
 * @param {{ path?: string, pattern?: string, kind?: string, union?: boolean, probe?: Function, client?: Function }} [options]
 * @returns {{ files: string[], source: "tokensave" | "javascript" }}
 */
export function listFiles(projectDir, { path, pattern, kind, union = false, probe = probeFilesystem, client = callToolSync } = {}) {
  if (probe(projectDir).available) {
    const result = client("files", { path, pattern, kind, format: "flat" }, { projectDir });

    if (result.ok && typeof result.value === "string") {
      const files = parseFlatFileList(result.value);

      if (files.length > 0) {
        return { files: union ? [...new Set([...files, ...walkFiles(projectDir, path ?? ".")])] : files, source: "tokensave" };
      }
    }
  }

  return { files: walkFiles(projectDir, path ?? "."), source: "javascript" };
}
