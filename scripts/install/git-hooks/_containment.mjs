

/** @module scripts/install/git-hooks/containment - is a hooks target inside the git directory? */

import { posix, win32 } from "node:path";

/**
 * Whether `target` is the git directory or lives under it.
 *
 * The two paths do not arrive in the same shape, which is the whole reason
 * this is a function and not a `startsWith`. Git answers with forward slashes
 * on every platform, including Windows (`D:/a/repo/.git`), while the target is
 * built with `path.join`, which answers with backslashes there
 * (`D:\a\repo\.git\hooks`). The same directory, and a raw string compare says
 * otherwise - so the installer refused a correct target and `prepare` failed
 * every Windows job.
 *
 * Resolve both, then compare on the platform's terms: Windows folds case
 * because its filesystem does, and the boundary needs a separator so that
 * `/repo/.git-evil` is not read as inside `/repo/.git`.
 *
 * @param {string} gitDir
 * @param {string} target
 * @param {NodeJS.Platform} [platform]
 * @returns {boolean}
 */
export function isInsideGitDir(gitDir, target, platform = process.platform) {
  const path = platform === "win32" ? win32 : posix;
  const fold = (value) => {
    const resolved = path.resolve(value);

    return platform === "win32" ? resolved.toLowerCase() : resolved;
  };

  const inside = fold(gitDir);
  const candidate = fold(target);
  const boundary = inside.endsWith(path.sep) ? inside : `${inside}${path.sep}`;

  return candidate === inside || candidate.startsWith(boundary);
}
