

import { existsSync, readdirSync } from "node:fs";
import { join, sep } from "node:path";
import { FAMILIES, NOT_NUMBERED } from "./_families.js";
import { gitOut, RECORD, ENTRY } from "./_git.js";

/**
 * Commit messages that name a document path which no longer exists.
 *
 * The case a second run hits: `--fix` moved the file and rewrote every
 * reference inside docs/, the message names a path that no longer exists, and
 * the plan it would come from is empty because the numbering is now clean.
 * The slug survives a renumber, so a path whose file is gone and whose slug
 * matches exactly one file is a rename this can state rather than guess.
 *
 * @param {{ projectDir?: string, scope?: "unpublished"|"all" }} [options]
 * @returns {Array<{sha: string, subject: string, from: string, to: string, family: string, match: "path"}>}
 */
export function orphanedPathReferences(options = {}) {
  const projectDir = options.projectDir ?? process.cwd();
  const hasUpstream = Boolean(gitOut(projectDir, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]));
  const range = options.scope === "all" || !hasUpstream ? "HEAD" : "@{upstream}..HEAD";
  const log = gitOut(projectDir, ["log", range, `--format=%h${RECORD}%s${RECORD}%B${ENTRY}`]);

  if (!log) {
    return [];
  }

  const found = [];
  const seen = new Set();

  for (const entry of log.split(ENTRY)) {
    const [sha, subject, body] = entry.split(RECORD);

    if (!sha?.trim()) {
      continue;
    }

    const text = `${subject}\n${body ?? ""}`;

    for (const family of FAMILIES) {
      const posix = family.dir.replaceAll(sep, "/");
      const pattern = new RegExp(String.raw`${posix}/(\d+)-([\w.-]+)\.md`, "g");

      for (const [path, , slug] of text.matchAll(pattern)) {
        if (existsSync(join(projectDir, path))) {
          continue;
        }

        const dir = join(projectDir, family.dir);
        const candidates = existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith(`-${slug}.md`) && !NOT_NUMBERED.has(name)) : [];

        if (candidates.length !== 1) {
          continue;
        }

        const entryKey = `${sha.trim()}:${path}`;

        if (seen.has(entryKey)) {
          continue;
        }

        seen.add(entryKey);
        found.push({
          sha: sha.trim(),
          subject: (subject ?? "").trim(),
          from: path,
          to: `${posix}/${candidates[0]}`,
          family: family.label,
          match: "path",
        });
      }
    }
  }

  return found;
}
