/** @module tools/apply/target - which destinations inside the root a write may name */

import { existsSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { isWithin, realOrSelf } from "./_roots.js";

/**
 * Path segments that are never a legitimate write destination: writing there is
 * code execution (git hooks, agent plugins) or credential theft, whatever the
 * content passed. Guardrails validate WHAT is written; this validates WHERE.
 */
const PROTECTED_SEGMENTS = new Set([".git", ".ssh", ".gnupg", ".agents", ".claude", "node_modules"]);

/** File names that are never part of a project tree. */
const PROTECTED_NAMES = new Set([
  ".zshrc",
  ".zshenv",
  ".zprofile",
  ".bashrc",
  ".bash_profile",
  ".profile",
  ".cshrc",
  ".kshrc",
  "authorized_keys",
  "known_hosts",
  "id_rsa",
  "id_ed25519",
]);

/**
 * Resolve a single write destination inside `rootDir`.
 *
 * Rejects, in order: unusable paths, absolute paths, `..` traversal, symlinked
 * escapes (checked against the real filesystem, not by string math), and
 * destinations that grant code execution or hold credentials.
 *
 * @param {string} rootDir - already validated by resolveProjectRoot
 * @param {string} targetPath - relative path supplied by the caller
 * @returns {string} the absolute path to write
 */
export function resolveWriteTarget(rootDir, targetPath) {
  if (typeof targetPath !== "string" || targetPath.trim() === "") {
    throw new Error("Refused: empty file path.");
  }

  if (targetPath.includes("\0")) {
    throw new Error(`Refused: invalid NUL byte in path "${targetPath}".`);
  }

  if (isAbsolute(targetPath) || /^[A-Za-z]:[\\/]/.test(targetPath)) {
    throw new Error(`Refused: "${targetPath}" is an absolute path - file paths must be relative to the project root.`);
  }

  const resolved = resolve(rootDir, targetPath);
  const relativePath = relative(rootDir, resolved);

  if (relativePath === "" || relativePath.startsWith("..")) {
    throw new Error(`Path traversal blocked: "${targetPath}" escapes project root "${rootDir}".`);
  }

  // Sensitive destinations are judged on the normalized path, so "src/../.git"
  // is refused for the same reason as ".git".
  const segments = relativePath.split(sep).filter(Boolean);

  for (const segment of segments) {
    if (PROTECTED_SEGMENTS.has(segment)) {
      throw new Error(`Refused: "${targetPath}" writes into the protected directory "${segment}".`);
    }
  }

  if (PROTECTED_NAMES.has(segments.at(-1))) {
    throw new Error(`Refused: "${targetPath}" is a protected file (${segments.at(-1)}).`);
  }

  // path.resolve is string math: a symlinked directory inside the project still
  // resolves to a path that "looks" contained. Ask the filesystem instead, via
  // the deepest ancestor that actually exists.
  const realRoot = realOrSelf(rootDir);
  let ancestor = resolved;

  while (!existsSync(ancestor)) {
    const parent = dirname(ancestor);

    if (parent === ancestor) {
      break;
    }

    ancestor = parent;
  }

  if (!isWithin(realOrSelf(ancestor), realRoot)) {
    throw new Error(`Refused: "${targetPath}" escapes the project root through a symlink.`);
  }

  return resolved;
}
