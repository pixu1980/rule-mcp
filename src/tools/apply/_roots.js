/** @module tools/apply/roots - which project roots a write may be anchored to */

import { realpathSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { parse, resolve, sep } from "node:path";

/**
 * Directories that are never a project. An earlier guard accepted any root the
 * caller named, so `path: "/"` made every destination "inside the project" and
 * the traversal check could not fail. Refusing implausible roots is what puts
 * a floor under the containment check.
 */
const SYSTEM_ROOTS = [
  "/etc",
  "/usr",
  "/bin",
  "/sbin",
  "/var",
  "/opt",
  "/boot",
  "/dev",
  "/proc",
  "/sys",
  "/System",
  "/Library",
  "/Applications",
  "/private/etc",
  "/private/var",
  String.raw`C:\Windows`,
  String.raw`C:\Program Files`,
];

/** Resolve a path to its real location when it exists, else leave it as-is. */
export const realOrSelf = (path) => {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
};

/** Is `candidate` the same path as `base`, or inside it? */
export const isWithin = (candidate, base) => candidate === base || candidate.startsWith(base + sep);

/**
 * Validate and resolve the project root a write is anchored to.
 * Throws when the root is not a plausible project directory.
 *
 * @param {string} rootPath - caller-supplied project root
 * @returns {string} the resolved root
 */
export function resolveProjectRoot(rootPath) {
  const root = resolve(rootPath || ".");

  if (root === parse(root).root) {
    throw new Error(`Refused: "${root}" is the filesystem root, not a project root.`);
  }

  if (root === realOrSelf(homedir()) || root === resolve(homedir())) {
    throw new Error(`Refused: "${root}" is the home directory, not a project root.`);
  }

  // Temp directories are legitimate scaffolding targets even though they sit
  // under /var on macOS, so they are checked before the system-root denylist.
  const temporaryRoots = [resolve(tmpdir()), realOrSelf(tmpdir())];

  if (temporaryRoots.some((temporary) => isWithin(root, temporary))) {
    return root;
  }

  const real = realOrSelf(root);

  for (const system of SYSTEM_ROOTS) {
    if (isWithin(root, system) || isWithin(real, system)) {
      throw new Error(`Refused: "${root}" is a system directory, not a project root.`);
    }
  }

  return root;
}
