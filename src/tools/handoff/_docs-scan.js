

/** Scan docs/ for roadmaps, changelogs and key documents. */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Where the documentation tree lives, relative to the project root. */
export const DOCS_DIR = "docs";

/**
 * Scan docs/ for roadmap files, changelogs, and key documentation.
 * Reports file sizes and last modified dates.
 */
export function scanProjectDocs(projectDir) {
  const docsPath = join(projectDir, DOCS_DIR);

  if (!existsSync(docsPath)) {
    return { roadmaps: [], changelogs: [], keyDocs: [], scanDate: new Date().toISOString() };
  }

  const result = { roadmaps: [], changelogs: [], keyDocs: [], scanDate: new Date().toISOString() };

  try {
    const entries = readdirSync(docsPath, { withFileTypes: true, recursive: true });

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const fullPath = join(entry.parentPath, entry.name);
      const relPath = relative(projectDir, fullPath);
      const isRoadmap = /roadmap|plan/i.test(entry.name);
      const isChangelog = /changelog|changes|history/i.test(entry.name);

      try {
        const stat = statSync(fullPath);
        const info = {
          path: relPath,
          size: stat.size,
          modified: stat.mtime.toISOString().slice(0, 10),
        };

        if (isRoadmap) {
          result.roadmaps.push(info);
        } else if (isChangelog) {
          result.changelogs.push(info);
        } else {
          result.keyDocs.push(info);
        }
      } catch {
        /* skip unreadable */
      }
    }
  } catch {
    /* skip unreadable */
  }

  return result;
}
