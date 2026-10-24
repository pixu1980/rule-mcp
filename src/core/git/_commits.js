/** @module core/git/commits - commit metadata and topological merge detection. */

import { git, gitLines } from "./_run.js";

/** Field and record separators for one `git log` read. */
const FIELD = "\u001F";
const RECORD = "\u001E";

/** One `git log` record format, shared by every read below. */
const LOG_FORMAT = `--format=%H${FIELD}%h${FIELD}%P${FIELD}%an${FIELD}%aI${FIELD}%s${FIELD}%b${RECORD}`;

/**
 * One commit, as `git log` reports it.
 *
 * @typedef {object} CommitRecord
 * @property {string} sha
 * @property {string} short
 * @property {string[]} parents
 * @property {boolean} isMerge true when the commit has more than one parent
 * @property {string} author
 * @property {string} date ISO-8601 author date
 * @property {string} subject first line of the message
 * @property {string} body the rest of the message
 */

/**
 * Parse one `\u001F`-separated `git log` record.
 *
 * @param {string} record
 * @returns {CommitRecord}
 */
function parseRecord(record) {
  const [sha, short, parents, author, date, subject, ...rest] = record.split(FIELD);
  const parentList = parents ? parents.split(" ").filter(Boolean) : [];

  return {
    sha,
    short,
    parents: parentList,
    isMerge: parentList.length > 1,
    author,
    date,
    subject,
    body: rest.join(FIELD).trim(),
  };
}

/**
 * Parse a whole `git log` read into records.
 *
 * @param {string} out
 * @returns {CommitRecord[]}
 */
function parseLog(out) {
  if (!out) {
    return [];
  }

  return out
    .split(RECORD)
    .map((record) => record.trim())
    .filter(Boolean)
    .map(parseRecord);
}

/**
 * Every commit in a revision range, newest first.
 *
 * @param {string} projectDir
 * @param {string} [range] a revspec such as "abc123..HEAD"; "" means all history
 * @returns {CommitRecord[]}
 */
export function listCommits(projectDir, range = "") {
  const args = ["log", LOG_FORMAT];

  if (range) {
    args.push(range);
  }

  return parseLog(git(projectDir, args));
}

/**
 * Metadata for an explicit set of commits.
 *
 * A pre-push check knows the shas git is about to send but not a range they
 * form - a branch with no remote counterpart has none - so it resolves the shas
 * itself and asks for exactly those.
 *
 * @param {string} projectDir
 * @param {string[]} shas
 * @returns {CommitRecord[]} in the order given
 */
export function listCommitsByShas(projectDir, shas) {
  if (shas.length === 0) {
    return [];
  }

  return parseLog(git(projectDir, ["log", "--no-walk=unsorted", LOG_FORMAT, ...shas]));
}

/**
 * The merge commits in a revision range, found by topology.
 *
 * `rev-list --merges` tests the parent list, not the subject, so a commit whose
 * message begins with "Merge" is not mistaken for a merge that actually happened.
 *
 * @param {string} projectDir
 * @param {string} [range] "" means all history
 * @returns {string[]} full shas, newest first
 */
export function mergeCommits(projectDir, range = "") {
  const args = ["rev-list", "--merges", range || "HEAD"];

  return gitLines(projectDir, args);
}
