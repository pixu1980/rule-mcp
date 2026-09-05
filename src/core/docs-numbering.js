/**
 * @module core/docs-numbering
 *
 * Repair the numbering of ADRs and handoffs after parallel branches merge.
 *
 * A feature branch allocates the next free number from what it can see, so two
 * branches off the same base both write `069-...`. Merging them produces a
 * duplicate that nothing catches: the number in a filename is an alias, and
 * two documents sharing one alias cannot be ordered or linked.
 *
 * The repair is deterministic and needs no model: order the documents by when
 * they were actually created (the first commit that added the file, falling
 * back to mtime for uncommitted ones), keep the earliest holder of a number,
 * and move the later ones to the next free slot - filename, header, and every
 * cross-reference that pointed at them.
 *
 * Planning and applying are separate on purpose: renaming files and rewriting
 * references across docs/ is not something a diagnostic does on its own.
 */

import { execFileSync } from "node:child_process";

import { adrAuthor, buildAdrIndex, listExistingAdrs } from "../tools/adr.js";
import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";

/** The numbered document families this repairs, and how each numbers itself. */
const FAMILIES = [
  { dir: join("docs", "adr"), pad: 3, label: "ADR" },
  { dir: join("docs", "handoff"), pad: 2, label: "handoff" },
];

/** Files that live beside the numbered documents without being one. */
const NOT_NUMBERED = new Set(["ADR.md", "README.md", "index.md"]);

/**
 * When a file entered the repository, as a unix timestamp.
 *
 * The first commit that added it, which survives merges and rebases far
 * better than the filename does. An uncommitted file falls back to its mtime,
 * which puts it last - correct, since it is the newest thing here.
 *
 * @param {string} projectDir
 * @param {string} relativePath
 * @returns {number}
 */
function createdAt(projectDir, relativePath) {
  try {
    const out = execFileSync("git", ["log", "--diff-filter=A", "--follow", "--format=%ct", "--", relativePath], {
      cwd: projectDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const first = out.split("\n").findLast(Boolean);

    if (first) {
      return Number(first);
    }
  } catch {
    /* not a repository, or the file was never committed */
  }

  try {
    return Math.floor(statSync(join(projectDir, relativePath)).mtimeMs / 1000);
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/** Every numbered document of one family, oldest first. */
function documentsIn(projectDir, family) {
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

/** Authors that name a program rather than a person (ADR 086). */
const TOOL_AUTHORS = new Set(["rule-mcp"]);

/** The `- **Author**:` bullet, in both punctuations the ADRs use. */
const AUTHOR_LINE = /^- \*\*Author(\*\*:|:\*\*) *(.*)$/m;

/** The `- **Tags**:` bullet the author line is filed next to. */
const TAGS_LINE = /^- \*\*Tags(\*\*:|:\*\*) *(.*)$/m;

/**
 * Who the git history says added a file.
 *
 * @param {string} projectDir
 * @param {string} relativePath
 * @returns {string} "Name <address>", or "" when git cannot answer
 */
function addedBy(projectDir, relativePath) {
  const out = gitOut(projectDir, ["log", "--follow", "--diff-filter=A", "--format=%an <%ae>", "--", relativePath]);

  return out.split("\n").findLast(Boolean) ?? "";
}

/**
 * ADRs whose author names a tool, or names nobody at all.
 *
 * The decision this repairs is ADR 086: the field answers "who do I ask", and
 * for every ADR written before that it answered with the name of a program.
 * The author is taken from the commit that added the file, because that is the
 * only record of who wrote it; a file git has never seen falls back to the
 * current git identity.
 *
 * A document with no author line and no tags bullet is left alone: there is
 * nowhere to put the line that would not be a guess about its header.
 *
 * @param {string} projectDir
 * @returns {Array<{file: string, current: string, author: string}>}
 */
function authorsToName(projectDir) {
  const family = FAMILIES.find((entry) => entry.label === "ADR");
  const out = [];

  for (const document of documentsIn(projectDir, family)) {
    const body = readFileSync(join(projectDir, document.relativePath), "utf8");
    const current = AUTHOR_LINE.exec(body)?.[2]?.trim() ?? "";

    if (current && !TOOL_AUTHORS.has(current)) {
      continue;
    }

    if (!current && !TAGS_LINE.test(body)) {
      continue;
    }

    out.push({
      file: document.relativePath,
      current,
      author: addedBy(projectDir, document.relativePath) || adrAuthor(),
    });
  }

  return out;
}

/**
 * Put the author into one ADR, replacing the tool name or adding the line.
 *
 * @param {string} file - absolute path
 * @param {string} author
 * @returns {boolean} whether the file changed
 */
function nameAuthorIn(file, author) {
  const body = readFileSync(file, "utf8");
  const existing = AUTHOR_LINE.exec(body);
  const next = existing
    ? body.replace(AUTHOR_LINE, `- **Author${existing[1]} ${author}`)
    : body.replace(
        TAGS_LINE,
        (line, punctuation, tags) => `- **Tags${punctuation} ${tags}\n- **Author${punctuation} ${author}`,
      );

  if (next === body) {
    return false;
  }

  writeFileSync(file, next);

  return true;
}

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
        const candidates = existsSync(dir)
          ? readdirSync(dir).filter((name) => name.endsWith(`-${slug}.md`) && !NOT_NUMBERED.has(name))
          : [];

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
 * @param {{ renames: object[] }} plan - from {@link planRenumber}
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

/** Field and record separators for one git log read. */
const RECORD = "\u001F";
const ENTRY = "\u001E";

/** Run git, returning trimmed stdout, or "" when it fails. */
function gitOut(cwd, args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

/**
 * What the repair would do.
 *
 * @param {{ projectDir?: string }} [options]
 * @returns {{ projectDir: string, collisions: object[], renames: object[] }}
 */
export function planRenumber(options = {}) {
  const projectDir = options.projectDir ?? process.cwd();
  const report = options.onProgress ?? (() => {});
  const collisions = [];
  const renames = [];

  for (const family of FAMILIES) {
    report({ step: "scan", message: `Scanning ${family.dir} for numbers and creation order` });
    const documents = documentsIn(projectDir, family);
    report({ step: "scan", message: `Read ${documents.length} ${family.label} document(s)` });
    const taken = new Set();

    for (const document of documents) {
      if (!taken.has(document.number)) {
        taken.add(document.number);
        continue;
      }
      // The earlier holder keeps the number; this one takes the next free slot.
      let next = document.number + 1;

      while (taken.has(next)) {
        next += 1;
      }

      taken.add(next);
      const padded = String(next).padStart(family.pad, "0");
      collisions.push({
        family: family.label,
        number: document.number,
        file: document.relativePath,
      });
      renames.push({
        family: family.label,
        from: document.relativePath,
        to: join(family.dir, `${padded}-${document.slug}.md`),
        fromNumber: String(document.number).padStart(family.pad, "0"),
        toNumber: padded,
        slug: document.slug,
      });
    }
  }

  report({ step: "authors", message: "Checking who each ADR names as its author" });
  const authors = authorsToName(projectDir);
  report({
    step: "authors",
    message: authors.length > 0 ? `${authors.length} ADR(s) name a tool or nobody` : "Every ADR names a person",
  });

  return { projectDir, collisions, renames, authors, indexUnordered: isAdrIndexUnordered(projectDir) };
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

/** Every markdown file that could carry a reference. */
function markdownFiles(dir, found = []) {
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
    const body = readFileSync(from, "utf8").replace(
      new RegExp(String.raw`^(#\s*)${rename.fromNumber}(:)`, "m"),
      `$1${rename.toNumber}$2`,
    );
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
      after = after
        .replaceAll(`[${rename.fromNumber}](${oldFile})`, `[${rename.toNumber}](${newFile})`)
        .replaceAll(oldFile, newFile);
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
    const unpublished = new Set(
      gitOut(projectDir, ["log", "@{upstream}..HEAD", "--format=%h"]).split("\n").filter(Boolean),
    );
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
      refused:
        "the working tree has uncommitted changes, and rewriting a message rewrites every commit after it; commit or stash first",
    };
  }

  const replacements =
    planned.length > 0
      ? planned.map((rename) => [rename.from, rename.to])
      : [...new Map(orphans.map((entry) => [entry.from, entry.to]))];
  report({ step: "messages", message: `Rewriting ${certain.length} message(s) with git filter-branch` });
  const script = replacements
    .map(([from, to]) => `s|${from.replaceAll("|", String.raw`\|`)}|${to.replaceAll("|", String.raw`\|`)}|g`)
    .join("; ");
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

/**
 * A human-readable report of a plan.
 *
 * @param {{ collisions: object[], renames: object[] }} plan
 * @returns {string}
 */
export function renderRenumberPlan(plan, options = {}) {
  // The report is rendered before the repair runs, so telling a caller that
  // already passed --fix to run with --fix is noise it cannot act on.
  const willFix = options.fix === true;

  const authors = plan.authors ?? [];
  const authorLines =
    authors.length === 0
      ? []
      : [
          `${authors.length} ADR(s) name a tool or nobody as their author:`,
          "",
          ...authors.map((entry) => `- ${entry.file}: ${entry.current || "no author line"} -> ${entry.author}`),
          ...(willFix ? [] : ["", "Run with --fix to name the person the commit says added each file."]),
        ];

  if (plan.renames.length === 0 && !plan.indexUnordered) {
    const clean = "Numbering is clean: no duplicate ADR or handoff numbers, and the ADR index is in order.";

    return authors.length === 0 ? clean : [clean, "", ...authorLines].join("\n");
  }

  if (plan.renames.length === 0) {
    return [
      "No duplicate numbers, but the ADR index (docs/adr/ADR.md) is out of order:",
      "a row sits above one with a higher number, which appends do and the generator does not.",
      ...(willFix ? [] : ["", "Run with --fix to regenerate it."]),
      ...(authorLines.length > 0 ? ["", ...authorLines] : []),
    ].join("\n");
  }

  const lines = [`${plan.collisions.length} collision(s) found:`, ""];

  if (authorLines.length > 0) {
    lines.push(...authorLines, "");
  }

  for (const rename of plan.renames) {
    lines.push(`- ${rename.family} ${rename.from} -> ${rename.to}`);
  }

  if (!willFix) {
    lines.push("", "Run with --fix to apply. References in docs/ are updated with the move.");
  }

  // A message that names a moved document still points at a number now held by
  // a different one. The repair cannot fix that without rewriting history, so it
  // says which commits are affected and leaves the decision where it belongs.
  const stale = staleCommitReferences(plan, { projectDir: plan.projectDir });

  if (stale.length > 0) {
    const certain = stale.filter((entry) => entry.match === "path");
    const ambiguous = stale.filter((entry) => entry.match === "number");

    lines.push("", `${stale.length} commit message(s) touch a document that moves. Git history is not rewritten.`);

    if (certain.length > 0) {
      lines.push(
        "",
        "Naming the moved file, so certainly stale:",
        "",
        ...certain.map(
          (entry) => `- ${entry.sha} ${entry.subject} (${entry.file} -> ${entry.family} ${entry.toNumber})`,
        ),
      );
    }

    if (ambiguous.length > 0) {
      lines.push(
        "",
        "Naming the number only. Two documents held it, which is why this repair exists, so which one each",
        "message meant is not knowable from the message:",
        "",
        ...ambiguous.map((entry) => `- ${entry.sha} ${entry.subject} (${entry.family} ${entry.fromNumber})`),
      );
    }

    lines.push("", "Amend them while they are local, or leave them and let the document headers carry the truth.");
  }

  return lines.join("\n");
}
