/** Walk every claim in a handoff and record what still holds. */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { HOLDS } from "./_constants.js";
import { git, gitKnows } from "./_git.js";
import { verifyBranch, verifyAdr } from "./_verify-refs.js";
import { ageLabel } from "./_age.js";

/**
 * Check every parsed claim against the repository.
 *
 * @param {string} projectDir
 * @param {object} claimed from parseHandoff
 * @returns {Array<{ kind: string, value: string, verdict: string, bucket: string }>}
 */
export function verify(projectDir, claimed) {
  const hasGit = git(projectDir, ["rev-parse", "--git-dir"]) !== "";
  const current = hasGit ? git(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"]) : "";
  const claims = [];
  const add = (kind, value, verdict) =>
    claims.push({
      kind,
      value,
      verdict,
      bucket:
        verdict.startsWith("unverified") || verdict.includes("not re-verified")
          ? "unverified"
          : HOLDS.has(verdict)
            ? "still-true"
            : "changed",
    });

  for (const branch of claimed.branches) {
    add("branch", branch, hasGit ? verifyBranch(projectDir, branch, current) : "unverified, no git repository");
  }

  let rangeKnown = false;

  if (claimed.range) {
    const { start, end } = claimed.range;
    const reachable = hasGit && git(projectDir, ["rev-parse", "--verify", "--quiet", `${start}^{commit}`]) !== "";

    if (reachable) {
      rangeKnown = true;
      // Counting from the start of the range answers a different question than
      // the one a reader asks. A handoff that covers `abc1234..HEAD` records no
      // sha for where HEAD was, so the count includes the work the handoff
      // itself describes: reported as "commits since" it read as work that
      // landed afterwards, and on this repository it was over-reporting by the
      // size of the range every time. A fixed end can be counted from.
      const openEnded = end.toUpperCase() === "HEAD";
      const endFixed = !openEnded && git(projectDir, ["rev-parse", "--verify", "--quiet", `${end}^{commit}`]) !== "";
      const from = endFixed ? end : start;
      const count = git(projectDir, ["rev-list", "--count", `${from}..HEAD`]) || "0";
      // Three facts, each with its own sentence: an end that can be counted
      // from, an end the handoff never fixed, and an end it fixed on a commit
      // this repository no longer has, which is what a rewritten message
      // leaves behind.
      const why = openEnded ? "which ends at HEAD" : "whose end is gone from this repository";
      add(
        "range",
        `${start}..${end}`,
        endFixed ? `${count} commits since the range ended` : `${count} commits in and since the range, ${why}`,
      );
    } else {
      add(
        "range",
        `${start}..${end}`,
        hasGit ? "unverified, commit not in this repository" : "unverified, no git repository",
      );
    }
  }

  for (const file of claimed.files) {
    if (existsSync(join(projectDir, file))) {
      if (rangeKnown) {
        const touched = git(projectDir, ["diff", "--name-only", `${claimed.range.start}..HEAD`, "--", file]);
        add("file", file, touched ? "modified since" : "unchanged");
      } else {
        add("file", file, "unverified, no commit range to compare against");
      }
    } else if (hasGit && !gitKnows(projectDir, file)) {
      // Absent and never tracked: a handoff naming a gitignored path, like the
      // recorder directory or an acceptance file, is explaining where something
      // lives. Calling that deleted invents a fact the same way a glob did.
      add("file", file, "unverified, git does not track this path");
    } else {
      add("file", file, "deleted");
    }
  }

  for (const id of claimed.adrs) {
    const status = verifyAdr(projectDir, id);
    add("adr", id, status);
    // An ADR the handoff called pending, and which has since landed, is the
    // single most misleading line to leave standing. One the handoff merely
    // cited as the record is a fact, not a change, however it reads now.
    claims.at(-1).bucket = claimed.pending.has(id) && status !== "still proposed" ? "changed" : "still-true";
  }

  for (const item of claimed.open) {
    add("open", item, "unverified, human judgment");
  }

  const when = ageLabel(claimed.date);

  for (const command of claimed.commands) {
    add("command", command, `claimed${when ? ` ${when}` : " in the handoff"}, not re-verified`);
  }

  return claims;
}
