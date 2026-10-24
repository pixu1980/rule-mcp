/**
 * @module cli/setup/legacy-hooks
 *
 * The git hook block earlier versions wrote, found so it can be removed.
 *
 * Nothing installs a hook any more - a recording lives under the home
 * directory, so no project needs a hook to keep it out of a commit (ADR 089).
 * What is left is the cleanup a machine that ran an older install still needs,
 * and the uninstall scan cannot offer that cleanup without first looking.
 *
 * @see module:core/runtime/git-hooks - the removal itself
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { GIT_HOOK_MARKER, HOOKED_GIT_EVENTS, gitHooksDir } from "../../core/git-hooks/index.js";

/**
 * The hook files that still carry the marked block.
 *
 * @param {{ dir?: string }} [options]
 * @returns {string[]}
 */
export function legacyHookFiles({ dir = gitHooksDir() } = {}) {
  return HOOKED_GIT_EVENTS.map((event) => join(dir, event)).filter((file) => {
    try {
      return existsSync(file) && readFileSync(file, "utf8").includes(GIT_HOOK_MARKER);
    } catch {
      // A hook that cannot be read cannot be cleaned either, so it is not
      // offered: reporting it would promise a removal that would fail.
      return false;
    }
  });
}
