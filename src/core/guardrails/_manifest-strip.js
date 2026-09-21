

/**
 * @module core/guardrails/manifest-strip
 *
 * The repair beside the rule: remove the manifest fields a generated
 * `package.json` must not carry.
 *
 * The guardrails report; the write path has to do something with what they
 * report. A model that writes `packageManager`, `engines` or
 * `devEngines.packageManager` into a manifest gets them removed before the
 * check, so the content a receipt binds is the content that gets written. The
 * edit is surgical: parse, delete, re-serialise with the indentation the file
 * already used, so everything around the removed keys survives.
 *
 * The path decides, not the content: a JSON config that happens to carry an
 * `engines` key is not a manifest and is left alone.
 */

import { MANIFEST_FILE } from "./quality/index.js";

/** The fields a generated manifest must not carry, outermost first. */
export const FORBIDDEN_MANIFEST_FIELDS = ["packageManager", "engines"];

/** The whitespace an indented line starts with, or two spaces. */
function indentationOf(code) {
  return /\n([ \t]+)"/.exec(code)?.[1] ?? "  ";
}

/** Remove the forbidden fields from a parsed manifest, naming each one removed. */
function stripParsed(manifest) {
  const removed = [];

  for (const field of FORBIDDEN_MANIFEST_FIELDS) {
    if (manifest[field] === undefined) {
      continue;
    }

    delete manifest[field];
    removed.push(field);
  }

  if (manifest.devEngines?.packageManager !== undefined) {
    delete manifest.devEngines.packageManager;
    removed.push("devEngines.packageManager");

    // An emptied container is a key nobody asked for; drop it with its member.
    if (Object.keys(manifest.devEngines).length === 0) {
      delete manifest.devEngines;
    }
  }

  return removed;
}

/**
 * Strip the forbidden fields from one file, when the file is a manifest.
 *
 * @param {string} code
 * @param {string} [fileName]
 * @returns {{ code: string, removed: string[] }}
 */
export function stripForbiddenManifestFields(code, fileName) {
  if (!MANIFEST_FILE.test(fileName ?? "")) {
    return { code, removed: [] };
  }

  let manifest;

  try {
    manifest = JSON.parse(code);
  } catch {
    return { code, removed: [] };
  }

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { code, removed: [] };
  }

  const removed = stripParsed(manifest);

  if (removed.length === 0) {
    return { code, removed: [] };
  }

  const trailing = code.endsWith("\n") ? "\n" : "";

  return { code: JSON.stringify(manifest, null, indentationOf(code)) + trailing, removed };
}

/**
 * Strip a file set, keeping the shape the write path uses.
 *
 * @param {Array<{ path: string, content: string }>} files
 * @returns {{ files: Array<{ path: string, content: string }>, removed: Array<{ path: string, fields: string[] }> }}
 */
export function stripManifestFiles(files) {
  const removed = [];
  const clean = files.map((file) => {
    const result = stripForbiddenManifestFields(file.content, file.path);

    if (result.removed.length > 0) {
      removed.push({ path: file.path, fields: result.removed });
    }

    return { path: file.path, content: result.code };
  });

  return { files: clean, removed };
}
