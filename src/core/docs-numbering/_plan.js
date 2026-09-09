import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FAMILIES, documentsIn } from "./_families.js";
import { authorsToName } from "./_authors.js";

/**
 * What the repair would do.
 *
 * @param {{ projectDir?: string }} [options]
 * @returns {{ projectDir: string, collisions: object[], gaps: object[], renames: object[] }}
 */
export function planRenumber(options = {}) {
  const projectDir = options.projectDir ?? process.cwd();
  const report = options.onProgress ?? (() => {});
  const collisions = [];
  const renames = [];
  const gaps = [];

  for (const family of FAMILIES) {
    report({ step: "scan", message: `Scanning ${family.dir} for numbers and creation order` });
    const documents = documentsIn(projectDir, family);
    report({ step: "scan", message: `Read ${documents.length} ${family.label} document(s)` });
    const taken = new Set();
    // Number every document first, then look at the sequence as a whole. The
    // two repairs are different: a collision is decided by creation order (the
    // earlier holder keeps the number), a hole by position (everything after
    // it moves down). Resolving collisions first means compaction sees one
    // unique number per document, whichever repair produced it.
    const assigned = [];

    for (const document of documents) {
      if (!taken.has(document.number)) {
        taken.add(document.number);
        assigned.push({ document, number: document.number });
        continue;
      }
      // The earlier holder keeps the number; this one takes the next free slot.
      let next = document.number + 1;

      while (taken.has(next)) {
        next += 1;
      }

      taken.add(next);
      collisions.push({
        family: family.label,
        number: document.number,
        file: document.relativePath,
      });
      assigned.push({ document, number: next });
    }

    // Compaction runs over the numbers, not over creation dates: closing a
    // hole must move the documents after it down by one, never reshuffle which
    // decision holds which number.
    //
    // The first document anchors the sequence rather than the number 1: a
    // family that deliberately starts at 068 is numbered, not broken, and
    // dragging it to 001 would rewrite every identity to reclaim numbers
    // nobody lost. Only the holes between the oldest and the newest close.
    const ordered = [...assigned].sort((left, right) => left.number - right.number);
    const anchor = ordered[0]?.number ?? 1;

    for (const [index, entry] of ordered.entries()) {
      const target = anchor + index;

      for (let missing = ordered[index - 1]?.number + 1 || entry.number; missing < entry.number; missing += 1) {
        gaps.push({ family: family.label, number: String(missing).padStart(family.pad, "0") });
      }

      if (target === entry.document.number) {
        continue;
      }

      const padded = String(target).padStart(family.pad, "0");
      renames.push({
        family: family.label,
        from: entry.document.relativePath,
        to: join(family.dir, `${padded}-${entry.document.slug}.md`),
        fromNumber: String(entry.document.number).padStart(family.pad, "0"),
        toNumber: padded,
        slug: entry.document.slug,
      });
    }
  }

  report({ step: "authors", message: "Checking who each ADR names as its author" });
  const authors = authorsToName(projectDir);
  report({
    step: "authors",
    message: authors.length > 0 ? `${authors.length} ADR(s) name a tool or nobody` : "Every ADR names a person",
  });

  return { projectDir, collisions, gaps, renames, authors, indexUnordered: isAdrIndexUnordered(projectDir) };
}

/**
 * Whether any table in `docs/adr/ADR.md` runs out of order.
 *
 * The index is generated newest first (ADR 051), and appends are what break it:
 * a repository with no duplicate numbers ended up with 082 above 081 because
 * rows were added by hand over time. Ordering is the condition on purpose - it
 * is what a reader notices, and it does not treat a hand-edited summary as
 * damage.
 *
 * The file holds several tables, each newest first, so each run of adjacent
 * rows is checked on its own.
 *
 * @param {string} projectDir
 * @returns {boolean}
 */
function isAdrIndexUnordered(projectDir) {
  const indexFile = join(projectDir, "docs", "adr", "ADR.md");

  if (!existsSync(indexFile)) {
    return false;
  }

  let previous;

  for (const line of readFileSync(indexFile, "utf8").split("\n")) {
    const row = line.match(/^\|\s*\[(\d{3})\]/);

    if (!row) {
      previous = undefined;
      continue;
    }

    const number = Number(row[1]);

    if (previous !== undefined && number > previous) {
      return true;
    }

    previous = number;
  }

  return false;
}
