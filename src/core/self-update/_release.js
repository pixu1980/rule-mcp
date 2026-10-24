/**
 * @module core/self-update/_release
 *
 * Whether a newer release exists: the highest version tag on the remote's
 * main against the highest one this checkout already contains.
 *
 * Tags are what `pnpm release` cuts (ADR 130), so a tag is what an update
 * moves to - never a commit that happens to sit on main between releases.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { compareVersions, formatVersion, highestVersionTag, parseVersion } from "./_semver.js";
import { git } from "./_git.js";

/** The branch releases are cut from. */
export const RELEASE_BRANCH = "main";

const RELEASE_REMOTE = "origin";

/** The version tags merged into a ref. */
async function tagsIn(root, reference) {
  const listed = await git(["tag", "--list", "v*", "--merged", reference], root);

  return listed ? listed.split("\n").filter(Boolean) : [];
}

/** The manifest version, for a checkout no release tag has reached yet. */
function manifestVersion(root) {
  try {
    return parseVersion(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version);
  } catch {
    return null;
  }
}

/**
 * The release this checkout runs and the newest one published.
 *
 * @param {string} root
 * @returns {Promise<{ latest: { tag: string, version: string }|null, current: string, newer: boolean }>}
 */
export async function releaseState(root) {
  const published = highestVersionTag(await tagsIn(root, `${RELEASE_REMOTE}/${RELEASE_BRANCH}`));

  if (!published) {
    return { latest: null, current: "", newer: false };
  }

  const installed = highestVersionTag(await tagsIn(root, "HEAD"))?.version ?? manifestVersion(root);

  return {
    latest: { tag: published.tag, version: formatVersion(published.version) },
    current: installed ? formatVersion(installed) : "",
    newer: !installed || compareVersions(published.version, installed) > 0,
  };
}
