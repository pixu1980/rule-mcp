

/** Verify one claimed reference: a branch against the trunks, an ADR against the files. */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ADR_DIR, TRUNKS } from "./_constants.js";
import { git } from "./_git.js";

/**
 * Where a branch stands now.
 *
 * @param {string} projectDir
 * @param {string} branch
 * @param {string} current
 * @returns {string}
 */
export function verifyBranch(projectDir, branch, current) {
  if (!git(projectDir, ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`])) {
    return "gone";
  }

  if (branch === current) {
    return "current";
  }

  for (const trunk of TRUNKS) {
    if (trunk === branch || !git(projectDir, ["rev-parse", "--verify", "--quiet", `refs/heads/${trunk}`])) {
      continue;
    }

    const merged = git(projectDir, ["merge-base", "--is-ancestor", branch, trunk]) === "" && isAncestor(projectDir, branch, trunk);

    if (merged) {
      return `merged into ${trunk}`;
    }
  }

  return "exists, not checked out";
}

/**
 * `git merge-base --is-ancestor` answers through its exit code and prints
 * nothing, so it needs its own call rather than the empty-string convention.
 *
 * @param {string} projectDir @param {string} a @param {string} b
 * @returns {boolean}
 */
export function isAncestor(projectDir, a, b) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", a, b], {
      cwd: projectDir,
      stdio: "ignore",
      timeout: 5000,
      killSignal: "SIGKILL",
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * The status of a referenced ADR, read from the file rather than from the index.
 *
 * @param {string} projectDir @param {string} id
 * @returns {string}
 */
export function verifyAdr(projectDir, id) {
  const dir = join(projectDir, ADR_DIR);

  if (!existsSync(dir)) {
    return "not written";
  }

  const file = readdirSync(dir).find((name) => name.startsWith(`${id}-`));

  if (!file) {
    return "not written";
  }

  const status = readFileSync(join(dir, file), "utf8")
    .match(/\*\*Status\*\*:\s*(\w+)/)?.[1]
    ?.toLowerCase();

  if (status === "proposed") {
    return "still proposed";
  }

  return status ?? "unverified, no status line";
}
