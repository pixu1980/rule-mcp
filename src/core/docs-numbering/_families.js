

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createdAt } from "./_git.js";

/** The numbered document families this repairs, and how each numbers itself. */
export const FAMILIES = [
  { dir: join("docs", "adr"), pad: 3, label: "ADR" },
  { dir: join("docs", "handoff"), pad: 2, label: "handoff" },
];

/** Files that live beside the numbered documents without being one. */
export const NOT_NUMBERED = new Set(["ADR.md", "README.md", "index.md"]);

/** Every numbered document of one family, oldest first. */
export function documentsIn(projectDir, family) {
  const dir = join(projectDir, family.dir);

  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((name) => name.endsWith(".md") && !NOT_NUMBERED.has(name))
    .map((name) => {
      const match = /^(\d+)-(.*)\.md$/.exec(name);

      return match
        ? {
            name,
            relativePath: join(family.dir, name),
            number: Number(match[1]),
            slug: match[2],
            createdAt: createdAt(projectDir, join(family.dir, name)),
          }
        : undefined;
    })
    .filter(Boolean)
    .sort((left, right) => left.createdAt - right.createdAt || left.name.localeCompare(right.name));
}

/** Every markdown file that could carry a reference. */
export function markdownFiles(dir, found = []) {
  if (!existsSync(dir)) {
    return found;
  }

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) {
      markdownFiles(path, found);
    } else if (path.endsWith(".md")) {
      found.push(path);
    }
  }

  return found;
}
