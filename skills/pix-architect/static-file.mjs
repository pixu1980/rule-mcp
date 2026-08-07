// rule-architect static-file helper - path-traversal containment.
// Pure logic, no I/O, no server. Shared by both interview servers.

import { resolve, sep } from "node:path";

/**
 * Resolve `filePath` and return it only if it stays inside one of `roots`;
 * return null if it would escape every root (path traversal).
 *
 * A path equal to a root, or under `root + sep`, is contained. The trailing
 * separator is load-bearing: without it `/srv/assetsX` would read as "inside"
 * `/srv/assets` on a plain string prefix check (the sibling-prefix trick).
 *
 * @param {string} filePath - candidate path, possibly carrying ../ segments
 * @param {string[]} roots  - absolute directory paths that bound the file
 * @returns {string|null} the resolved absolute path, or null if it escapes
 */
export function containWithin(filePath, roots) {
  const resolved = resolve(filePath);

  for (const root of roots) {
    const base = resolve(root);

    if (resolved === base || resolved.startsWith(base + sep)) {
      return resolved;
    }
  }

  return null;
}
