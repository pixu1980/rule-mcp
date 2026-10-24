import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { join } from "node:path";

/** Field separator for one git log read. */
export const RECORD = "\u001F";

/** Record separator for one git log read. */
export const ENTRY = "\u001E";

/** Run git, returning trimmed stdout, or "" when it fails. */
export function gitOut(cwd, args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

/**
 * When a file entered the repository, as a unix timestamp.
 *
 * The first commit that added it, which survives merges and rebases far
 * better than the filename does. An uncommitted file falls back to its mtime,
 * which puts it last - correct, since it is the newest thing here.
 *
 * @param {string} projectDir
 * @param {string} relativePath
 * @returns {number}
 */
export function createdAt(projectDir, relativePath) {
  try {
    const out = execFileSync("git", ["log", "--diff-filter=A", "--follow", "--format=%ct", "--", relativePath], {
      cwd: projectDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const first = out.split("\n").findLast(Boolean);

    if (first) {
      return Number(first);
    }
  } catch {
    /* not a repository, or the file was never committed */
  }

  try {
    return Math.floor(statSync(join(projectDir, relativePath)).mtimeMs / 1000);
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/**
 * Who the git history says added a file.
 *
 * @param {string} projectDir
 * @param {string} relativePath
 * @returns {string} "Name <address>", or "" when git cannot answer
 */
export function addedBy(projectDir, relativePath) {
  const out = gitOut(projectDir, ["log", "--follow", "--diff-filter=A", "--format=%an <%ae>", "--", relativePath]);

  return out.split("\n").findLast(Boolean) ?? "";
}
