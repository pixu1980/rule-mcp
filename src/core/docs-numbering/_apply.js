import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildAdrIndex, listExistingAdrs } from "../../tools/adr/index.js";
import { markdownFiles } from "./_families.js";
import { nameAuthorIn } from "./_authors.js";

/**
 * Carry out the plan: move the files, fix their headers, follow the links.
 *
 * @param {{ renames: object[] }} plan - from planRenumber
 * @param {{ projectDir?: string }} [options]
 * @returns {{ renamed: number, referencesUpdated: number }}
 */
export function applyRenumber(plan, options = {}) {
  const projectDir = options.projectDir ?? plan.projectDir ?? process.cwd();
  const report = options.onProgress ?? (() => {});
  let renamed = 0;

  for (const rename of plan.renames) {
    report({ step: "rename", message: `Renaming ${rename.from} -> ${rename.to}` });
    const from = join(projectDir, rename.from);
    const to = join(projectDir, rename.to);

    if (!existsSync(from)) {
      continue;
    }
    // The header states the number too, and a header that disagrees with the
    // filename is worse than the collision it came from.
    const body = readFileSync(from, "utf8").replace(new RegExp(String.raw`^(#\s*)${rename.fromNumber}(:)`, "m"), `$1${rename.toNumber}$2`);
    writeFileSync(from, body);
    renameSync(from, to);
    renamed += 1;
  }

  let referencesUpdated = 0;

  if (plan.renames.length > 0) {
    report({ step: "references", message: "Updating references across docs/" });
  }

  for (const file of markdownFiles(join(projectDir, "docs"))) {
    const before = readFileSync(file, "utf8");
    let after = before;

    for (const rename of plan.renames) {
      const oldFile = `${rename.fromNumber}-${rename.slug}.md`;
      const newFile = `${rename.toNumber}-${rename.slug}.md`;
      // A markdown link carries the number twice: as the label and inside the
      // target. Both move, and only for the document that actually moved.
      after = after.replaceAll(`[${rename.fromNumber}](${oldFile})`, `[${rename.toNumber}](${newFile})`).replaceAll(oldFile, newFile);
    }

    if (after !== before) {
      writeFileSync(file, after);
      referencesUpdated += 1;
    }
  }

  // The index is generated from the ADR files (ADR 051), so after a move it is
  // rebuilt rather than patched: link rewriting would leave the rows, the
  // titles and the order describing the arrangement before the repair.
  if (plan.renames.some((rename) => rename.family === "ADR") || plan.indexUnordered) {
    report({ step: "index", message: "Regenerating docs/adr/ADR.md from the files on disk" });
  }

  const indexRegenerated = regenerateAdrIndex(projectDir, plan);
  let authorsNamed = 0;

  for (const entry of plan.authors ?? []) {
    report({ step: "authors", message: `Naming ${entry.author} in ${entry.file}` });

    if (nameAuthorIn(join(projectDir, entry.file), entry.author)) {
      authorsNamed += 1;
    }
  }

  return { renamed, referencesUpdated, indexRegenerated, authorsNamed };
}

/**
 * Rebuild `docs/adr/ADR.md` from the files on disk.
 *
 * @param {string} projectDir
 * @param {{ renames: object[] }} plan
 * @returns {boolean} whether the index was rewritten
 */
function regenerateAdrIndex(projectDir, plan) {
  const touchedAdrs = plan.renames.some((rename) => rename.family === "ADR");
  const adrDir = join(projectDir, "docs", "adr");

  if ((!touchedAdrs && !plan.indexUnordered) || !existsSync(join(adrDir, "ADR.md"))) {
    return false;
  }

  writeFileSync(join(adrDir, "ADR.md"), buildAdrIndex(listExistingAdrs(adrDir)));

  return true;
}
