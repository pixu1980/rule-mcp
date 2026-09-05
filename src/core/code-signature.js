/**
 * @module core/code-signature
 *
 * A short digest of the server's own code, for anything that caches a result
 * derived from it.
 *
 * An answer depends on the code that computed it, and the package version does
 * not say what that code was: this project installs by `git pull`, where a
 * commit that changes what a tool returns rarely moves the version. Without a
 * signature a cached entry outlives the code that produced it, and the replay is
 * indistinguishable from a fresh answer.
 *
 * The newest mtime under `src/` answers it in about two milliseconds, once per
 * process, and it moves for an uncommitted edit as readily as for a pull. It is
 * coarse on purpose: a false invalidation costs a recompute, a missed one
 * returns an answer the current code would not produce.
 *
 * It lives in its own module because both the result cache and the BM25 index
 * need it, and the result cache already imports from the index - putting it in
 * either one would close a cycle.
 */

import { createHash } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { pkg as package_ } from "../cli/paths.js";

/** Memoized: the source tree does not change under a running process. */
let _signature;

/**
 * @returns {string} 12 hex characters covering the package version and the
 *   newest modification time of any `.js` file under `src/`
 */
export function codeSignature() {
  if (_signature) {
    return _signature;
  }

  const root = fileURLToPath(new URL("..", import.meta.url));
  let newest = 0;
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const path = join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(path);
        continue;
      }

      if (entry.name.endsWith(".js")) {
        newest = Math.max(newest, statSync(path).mtimeMs);
      }
    }
  };

  walk(root);
  _signature = createHash("sha256").update(`${package_.version}:${newest}`).digest("hex").slice(0, 12);

  return _signature;
}
