import { execFileSync } from "node:child_process";
import { gitOut } from "./_git.js";
import { orphanedPathReferences } from "./_orphans.js";
import { staleCommitReferences } from "./_stale-commits.js";

/**
 * Rewrite the commit messages that certainly name a moved document.
 *
 * Only the certain ones: a message naming just a number referred to a number two
 * documents shared, so a rewrite would have to guess which. Only unpublished
 * commits, because amending a pushed commit changes a sha somebody else already
 * has. Both restrictions are reported rather than assumed.
 *
 * @param {{ renames: object[] }} plan
 * @param {{ projectDir?: string }} [options]
 * @returns {{ rewritten: number, skipped: number, refused?: string }}
 */
export function rewriteCommitReferences(plan, options = {}) {
  const projectDir = options.projectDir ?? plan?.projectDir ?? process.cwd();
  const report = options.onProgress ?? (() => {});
  report({ step: "messages", message: "Reading the commit messages that name a moved document" });
  // A plan with renames states which document moved. A plan with none does not
  // mean nothing moved: a previous --fix already did the renaming, and the
  // messages naming a path that no longer exists are what is left to repair.
  const planned = plan?.renames?.length ? plan.renames : [];
  const stale = planned.length > 0 ? staleCommitReferences(plan, { projectDir }) : [];
  const orphans = planned.length > 0 ? [] : orphanedPathReferences({ projectDir });
  const certain = [...stale.filter((entry) => entry.match === "path"), ...orphans];
  const skipped = stale.length - stale.filter((entry) => entry.match === "path").length;

  const upstream = gitOut(projectDir, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);

  if (certain.length === 0) {
    // Nothing amendable here. If the references exist further back, they are
    // published, and saying so is more use than reporting nothing to do.
    const buried = upstream
      ? [
          ...(planned.length > 0
            ? staleCommitReferences(plan, { projectDir, scope: "all" }).filter((entry) => entry.match === "path")
            : orphanedPathReferences({ projectDir, scope: "all" })),
        ]
      : [];

    return buried.length > 0
      ? {
          rewritten: 0,
          skipped: buried.length,
          refused: `${buried.length} of them are already published on ${upstream}; amending would change a sha somebody else has`,
        }
      : { rewritten: 0, skipped };
  }

  if (upstream) {
    const unpublished = new Set(gitOut(projectDir, ["log", "@{upstream}..HEAD", "--format=%h"]).split("\n").filter(Boolean));
    const published = certain.filter((entry) => !unpublished.has(entry.sha));

    if (published.length > 0) {
      return {
        rewritten: 0,
        skipped: stale.length,
        refused: `${published.length} of them are already published on ${upstream}; amending would change a sha somebody else has`,
      };
    }
  }

  if (gitOut(projectDir, ["status", "--porcelain"])) {
    return {
      rewritten: 0,
      skipped: certain.length,
      refused: "the working tree has uncommitted changes, and rewriting a message rewrites every commit after it; commit or stash first",
    };
  }

  const replacements = planned.length > 0 ? planned.map((rename) => [rename.from, rename.to]) : [...new Map(orphans.map((entry) => [entry.from, entry.to]))];
  report({ step: "messages", message: `Rewriting ${certain.length} message(s) with git filter-branch` });
  const script = replacements.map(([from, to]) => `s|${from.replaceAll("|", String.raw`\|`)}|${to.replaceAll("|", String.raw`\|`)}|g`).join("; ");
  const range = upstream ? "@{upstream}..HEAD" : "--all";

  try {
    execFileSync("git", ["filter-branch", "--force", "--msg-filter", `sed -e '${script}'`, "--", range], {
      cwd: projectDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, FILTER_BRANCH_SQUELCH_WARNING: "1" },
    });
  } catch (error) {
    return { rewritten: 0, skipped: stale.length, refused: `git refused the rewrite: ${error.message.slice(0, 120)}` };
  }

  return { rewritten: certain.length, skipped };
}
