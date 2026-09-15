

/** Closeout: completed audits/reviews/plans fold into ADRs, then leave the tree. */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, parse } from "node:path";

import { updateAdrIndex } from "../adr/_adr-index.js";
import { adrAuthor } from "../adr/_author.js";
import { generateAdr } from "../adr/_body.js";
import { adrEnglishOffenses } from "../adr/_english.js";
import { ADR_DIR, adrFilename, listExistingAdrs, nextAdrNumber } from "../adr/_files.js";

/** Working-paper kinds that close out, in archive order. */
const KINDS = ["plans", "reviews", "audits"];

/** True when a plan carries checks and none is open. */
function planDone(text) {
  const lines = text.split("\n");

  return lines.some((line) => /^\s*-\s*\[[xX]\]/.test(line)) && lines.every((line) => !/^\s*-\s*\[ \]/.test(line));
}

/** True when a review shows a Status column and no open row. */
function reviewDone(text) {
  return /\|\s*Status\s*\|/.test(text) && !/\|\s*open\s*\|/.test(text);
}

/** Matches of re in text. */
function countMatches(text, re) {
  return (text.match(re) ?? []).length;
}

/** The first H1, carried into the ADR so the record keeps its name. */
function titleOf(text, fallback) {
  return text.match(/^# (.+)$/m)?.[1].trim() || fallback;
}

/** The run date a working paper stamps on itself, or "". */
function dateOf(text) {
  return text.match(/\*\*Date\*\*: (\S+)/)?.[1] || "";
}

/** Read-only scan: every completed doc with its size, never touching disk. */
export function findCompletedDocs(projectDir) {
  const docs = (kind) => join(projectDir, "docs", kind);
  const list = (kind) => {
    try {
      return readdirSync(docs(kind)).filter((file) => file.endsWith(".md"));
    } catch {
      return [];
    }
  };
  const read = (kind, file) => {
    try {
      return readFileSync(join(docs(kind), file), "utf8");
    } catch {
      return null;
    }
  };
  const reviewState = new Map();

  for (const file of list("reviews")) {
    const text = read("reviews", file) ?? "";

    reviewState.set(parse(file).name, { done: reviewDone(text), resolved: countMatches(text, /\|\s*resolved\s*\|/g) });
  }

  const done = [];

  for (const kind of KINDS) {
    for (const file of list(kind)) {
      const text = read(kind, file);

      if (text === null) {
        continue;
      }

      const name = parse(file).name;
      const review = reviewState.get(name) ?? { done: false, resolved: 0 };
      const complete = kind === "plans" ? planDone(text) : review.done;

      if (complete) {
        const items = kind === "plans" ? countMatches(text, /^\s*-\s*\[[xX]\]/gm) : review.resolved;

        done.push({ kind, name, path: `docs/${kind}/${file}`, title: titleOf(text, name), date: dateOf(text), items });
      }
    }
  }

  return done;
}

/** The ADR fields one archived doc folds into. The source title rides along. */
function closeoutFields(doc) {
  const kind = doc.kind.slice(0, -1);
  const when = doc.date ? ` on ${doc.date}` : "";

  return {
    title: `Close out ${kind} ${doc.name}`,
    context: `The ${kind} record ${doc.path}, "${doc.title}", finished with ${doc.items} resolved items${when}.`,
    decision: "Fold the record into this ADR and the session handoff, then delete the source file. The full text stays in git history.",
    consequences: `${doc.path} is gone from the tree; the handoff of this session names what it carried.`,
    alternatives: [],
    tags: ["docs", "closeout", kind],
  };
}

/** Archive every completed doc: one ADR each, a refreshed index, sources deleted. Docs failing the English gate are skipped and kept, with the reason reported. */
export function archiveCompletedDocs(projectDir, { author } = {}) {
  const archived = [];
  const skipped = [];
  const adrDir = join(projectDir, ADR_DIR);

  for (const doc of findCompletedDocs(projectDir)) {
    const fields = closeoutFields(doc);
    const offenses = adrEnglishOffenses({ title: fields.title, context: fields.context, decision: fields.decision, consequences: fields.consequences });

    if (offenses.length > 0) {
      skipped.push({ path: doc.path, reason: `non-English content fails the ADR gate (${offenses[0]})` });
      continue;
    }

    mkdirSync(adrDir, { recursive: true });
    const number = nextAdrNumber(adrDir);
    const adrFile = adrFilename(number, fields.title);

    writeFileSync(join(adrDir, adrFile), generateAdr({ number, status: "accepted", author: author || adrAuthor(), ...fields }));
    rmSync(join(projectDir, doc.path));
    archived.push({ ...doc, adrNumber: number, adrFile });
  }

  if (archived.length > 0) {
    updateAdrIndex(adrDir, listExistingAdrs(adrDir));
  }

  return { archived, skipped };
}

/** The handoff section naming what close-session archived and what it kept. */
export function closeoutLines(closeout, { isMinimal }) {
  if (!closeout || isMinimal || (closeout.archived.length === 0 && closeout.skipped.length === 0)) {
    return [];
  }

  return [
    "### Closeout",
    "",
    ...closeout.archived.map((doc) => `- Archived \`${doc.path}\` → ADR ${String(doc.adrNumber).padStart(3, "0")} (\`${doc.adrFile}\`); source file deleted.`),
    ...closeout.skipped.map((doc) => `- Skipped \`${doc.path}\`: ${doc.reason}; file kept.`),
    "",
  ];
}
