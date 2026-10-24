/**
 * @module core/self-update/_semver
 *
 * Reading, ordering and picking the highest release tag.
 *
 * Three numbers and nothing else: a tag carrying a prerelease suffix is not
 * read as a release here, because deciding what `1.0.0-rc.1` bumps to is a
 * policy nobody stated.
 */

/** `1.2.3`, with the `v` a tag usually wears. */
const VERSION = /^v?(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)$/;

/**
 * Read a version, or null when the text is not one.
 *
 * @param {string} text
 * @returns {{ major: number, minor: number, patch: number }|null}
 */
export function parseVersion(text) {
  const match = VERSION.exec(String(text ?? "").trim());

  if (!match) {
    return null;
  }

  const { major, minor, patch } = match.groups;

  return { major: Number(major), minor: Number(minor), patch: Number(patch) };
}

/**
 * Order two versions: negative when the first is older.
 *
 * @param {{ major: number, minor: number, patch: number }} left
 * @param {{ major: number, minor: number, patch: number }} right
 * @returns {number}
 */
export function compareVersions(left, right) {
  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}

/**
 * The version as a string, without the tag's `v`.
 *
 * @param {{ major: number, minor: number, patch: number }} version
 * @returns {string}
 */
export function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * The highest version among these tags, with the tag that carried it.
 *
 * @param {string[]} tags
 * @returns {{ tag: string, version: { major: number, minor: number, patch: number } }|null}
 */
export function highestVersionTag(tags) {
  let best = null;

  for (const tag of tags) {
    const version = parseVersion(tag);

    if (version && (!best || compareVersions(version, best.version) > 0)) {
      best = { tag, version };
    }
  }

  return best;
}
