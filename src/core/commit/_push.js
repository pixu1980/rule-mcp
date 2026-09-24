

/**
 * @module core/commit/push
 *
 * The commits a push would send, from the `pre-push` hook's stdin.
 *
 * Each line is `<local ref> <local sha> <remote ref> <remote sha>`. A range is
 * `remoteSha..localSha` when the remote already has the ref; otherwise it is
 * everything reachable from `localSha` that no remote has, which is what a
 * brand-new branch pushes.
 */

import { gitLines, listCommits, listCommitsByShas } from "../git/index.js";
import { lintCommits } from "./_lint.js";

/** A push line's all-zero sha means "create or delete this ref". */
const ZERO_SHA = /^0+$/u;

/**
 * Every commit the push would send, deduplicated, in input order.
 *
 * @param {string} projectDir
 * @param {string} stdinText
 * @returns {import("../git/index.js").CommitRecord[]}
 */
export function pushCommits(projectDir, stdinText) {
  const seen = new Set();
  const commits = [];

  for (const line of String(stdinText).split("\n")) {
    if (!line.trim()) {
      continue;
    }

    const [, localSha, , remoteSha] = line.trim().split(/\s+/u, 4);

    if (!localSha || ZERO_SHA.test(localSha)) {
      continue;
    }

    const reachable =
      remoteSha && !ZERO_SHA.test(remoteSha)
        ? listCommits(projectDir, `${remoteSha}..${localSha}`)
        : listCommitsByShas(projectDir, gitLines(projectDir, ["rev-list", localSha, "--not", "--remotes"]));

    for (const commit of reachable) {
      if (seen.has(commit.sha)) {
        continue;
      }

      seen.add(commit.sha);
      commits.push(commit);
    }
  }

  return commits;
}

/**
 * Validate every commit a push would send.
 *
 * @param {string} projectDir
 * @param {string} stdinText
 * @returns {{ linted: number, violations: import("./_lint.js").Violation[] }}
 */
export function lintPush(projectDir, stdinText) {
  return lintCommits(pushCommits(projectDir, stdinText));
}
