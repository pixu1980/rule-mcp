

import { gitOut, RECORD, ENTRY } from "./_git.js";

/**
 * Commit messages that name a document this plan is about to move.
 *
 * The renumber fixes files and the references inside them. A commit message is
 * neither: it is history, and after the move it points at a number that belongs
 * to a different document. Reporting is all this does - rewriting a message
 * means rewriting history, which is a decision for whoever owns the branch and
 * not a side effect of a numbering repair.
 *
 * Scoped to what has not been published where an upstream exists, because those
 * are the only commits anybody could still safely amend.
 *
 * @param {{ renames: object[] }} plan - from {@link module:core/docs-numbering/plan.planRenumber}
 * @param {{ projectDir?: string, scope?: "unpublished"|"all" }} [options]
 * @returns {Array<{sha: string, subject: string, file: string, fromNumber: string, toNumber: string, family: string, match: string}>}
 */
export function staleCommitReferences(plan, options = {}) {
  const projectDir = options.projectDir ?? process.cwd();

  if (!plan?.renames?.length) {
    return [];
  }

  const hasUpstream = Boolean(gitOut(projectDir, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]));
  const range = options.scope === "all" || !hasUpstream ? "HEAD" : "@{upstream}..HEAD";
  const log = gitOut(projectDir, ["log", range, `--format=%h${RECORD}%s${RECORD}%B${ENTRY}`]);

  if (!log) {
    return [];
  }

  const stale = [];

  for (const entry of log.split(ENTRY)) {
    const [sha, subject, body] = entry.split(RECORD);

    if (!sha?.trim()) {
      continue;
    }

    for (const rename of plan.renames) {
      const text = `${subject}\n${body ?? ""}`;
      // A path names one document, so the reference is certainly stale. A bare
      // number named two documents - that is why the repair exists - so which
      // one the message meant is not knowable from the message.
      const byPath = text.includes(rename.from);
      const numbers = [`${rename.family} ${Number(rename.fromNumber)}`, `${rename.family} ${rename.fromNumber}`];
      const byNumber = numbers.some((phrase) => new RegExp(String.raw`\b${phrase}\b`, "i").test(text));

      if (byPath || byNumber) {
        stale.push({
          sha: sha.trim(),
          subject: (subject ?? "").trim(),
          file: rename.from,
          fromNumber: rename.fromNumber,
          toNumber: rename.toNumber,
          family: rename.family,
          match: byPath ? "path" : "number",
        });
      }
    }
  }

  return stale;
}
