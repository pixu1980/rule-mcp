/**
 * @module core/sync/guard
 *
 * The branch-sync guard: check the base branch on real activity, and surface
 * the verdict once as a banner.
 *
 * There is no timer. The check runs because a tool call or a prompt happened,
 * which is the only evidence that someone is working. A throttle keeps a tight
 * loop from spawning a git process per call, and the same divergence is
 * announced once rather than on every call, so the notice stays signal.
 *
 * The verdict itself comes from `core/git`; nothing here infers it.
 */

import { checkBaseBranchFreshness } from "../git/index.js";
import { CHECK_INTERVAL_MS, syncGuardEnabled } from "./_config.js";

/** Timestamp of the last kicked-off check (0 = never). */
let lastCheckAt = 0;

/** Single-flight promise so concurrent invocations share one check. */
let inflight = null;

/** The notice to prepend to a later tool result (consumed once). */
let pendingNotice = null;

/** The last divergence announced, so the same one is not repeated. */
let announced = "";

/**
 * The user-visible notice for one verdict, or null when there is nothing to say.
 *
 * @param {import("../git/index.js").BaseFreshness} freshness
 * @returns {string|null}
 */
export function freshnessNotice(freshness) {
  if (!freshness?.requiresRebase) {
    return null;
  }

  return (
    `⚠️ Base branch ${freshness.baseRef} advanced by ${freshness.behind} commit(s) since this branch forked ` +
    `(${freshness.ahead} on the branch, ${freshness.behind} on the base). Run \`rule_tool_sync\` to review, then confirm the rebase.`
  );
}

/**
 * The identity of one divergence: the same base at the same fork point, the
 * same distance. A rebase changes it, so the next divergence is announced again.
 *
 * @param {import("../git/index.js").BaseFreshness} freshness
 * @returns {string}
 */
function divergenceKey(freshness) {
  return freshness?.requiresRebase ? `${freshness.baseRef}@${freshness.mergeBase}+${freshness.behind}` : "";
}

/**
 * Kick a throttled base-branch check. The caller may await the returned promise
 * (tests) or ignore it (the router: the tool responds and any notice lands on a
 * later result).
 *
 * @param {string} [projectDir]
 * @returns {Promise<object>|undefined} the in-flight check, or undefined when throttled/disabled
 */
export function maybeSyncCheck(projectDir = process.cwd()) {
  if (!syncGuardEnabled()) {
    return;
  }

  if (inflight) {
    return inflight;
  }

  const now = Date.now();

  // A never-checked process reads 0, so the first call always runs.
  if (lastCheckAt !== 0 && now - lastCheckAt < CHECK_INTERVAL_MS) {
    return;
  }

  lastCheckAt = now;
  inflight = Promise.resolve()
    .then(() => checkBaseBranchFreshness(projectDir))
    .then((freshness) => {
      const key = divergenceKey(freshness);

      if (key && key !== announced) {
        announced = key;
        pendingNotice = freshnessNotice(freshness);
      }

      return freshness;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/**
 * Consume the pending sync notice (returns it once, then clears it).
 *
 * @returns {string|null}
 */
export function consumeSyncNotice() {
  const notice = pendingNotice;

  pendingNotice = null;

  return notice;
}

/** Clear every piece of guard state. Tests only. */
export function resetSyncGuard() {
  lastCheckAt = 0;
  inflight = null;
  pendingNotice = null;
  announced = "";
}
