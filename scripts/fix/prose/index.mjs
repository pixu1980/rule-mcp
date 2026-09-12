#!/usr/bin/env node
/**
 * @module scripts/clean-prose
 *
 * Runs the output passes over the repository's own sources.
 *
 * The server cleans what it emits, but the skills, docs and comments it emits
 * FROM are written by hand and drift: an em dash here, a `colour` there. The
 * `fp-*` guardrails fail on exactly those, so the repo has to pass its own
 * rules before it can enforce them on anyone else.
 *
 * Three passes: fingerprint removal (punctuation and spelling), box alignment
 * (a drawn box has to be a rectangle), and optionally caveman compression.
 *
 * Dry-run by default. `--apply` writes. `--caveman` additionally compresses
 * prose, which is a much bigger change - headings are the routing surface, so
 * that pass is opt-in and reviewed separately.
 *
 * Usage:
 *   node scripts/clean-prose.mjs                       # report
 *   node scripts/clean-prose.mjs --apply               # fingerprint pass
 *   node scripts/clean-prose.mjs --apply --caveman     # + compression
 *   node scripts/clean-prose.mjs --apply skills        # limit to a path prefix
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { compressText } from "../../../src/core/text/_caveman.js";
import { alignAsciiBoxes, findRaggedBoxes } from "@rule-mcp/sdk/text";
import { findFingerprints, stripFingerprint } from "@rule-mcp/sdk/text";
import { SKIP, TRACKED } from "./_targets.data.mjs";

const arguments_ = process.argv.slice(2);
const apply = arguments_.includes("--apply");
const withCaveman = arguments_.includes("--caveman");
const prefixes = arguments_.filter((a) => !a.startsWith("--"));
// the script silently skips exactly the files most likely to need it: three
// batches of new skills passed a clean scan while still untracked.
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", ...TRACKED], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter((f) => f && !SKIP.some((re) => re.test(f)))
  .filter((f) => prefixes.length === 0 || prefixes.some((p) => f.startsWith(p)))
  // git lists a deleted-but-still-tracked file; reading it would crash the pass.
  .filter((f) => existsSync(f));

/**
 * Files read as prose get the whole pass. The rest get the spelling rules only:
 * an installer's arrow and bullet are interface it draws, not punctuation a
 * reader parses, and `->` in a picker is a worse picker.
 */
const PROSE = new Set([".md", ".js", ".mjs", ".cjs", ".ts", ".mts", ".txt"]);
const isProse = (file) => PROSE.has(file.slice(file.lastIndexOf(".")));

/** Headings are what the router scores against; a changed heading is a changed route. */
const headings = (text) => text.split("\n").filter((l) => /^#{1,6}\s/.test(l));

let changed = 0;
let dashes = 0;
let typographic = 0;
let british = 0;
let raggedLines = 0;
const headingChanges = [];

for (const file of files) {
  const before = readFileSync(file, "utf8");
  const prose = isProse(file);
  const found = findFingerprints(before);
  // Counted the way the pass runs, so a zero means "nothing left to fix" and
  // not "nothing left that we happen to look at".
  if (prose) {
    dashes += found.dashes.length;
    typographic += found.typographic.length;
  }
  british += found.british.length;
  raggedLines += findRaggedBoxes(before).filter((entry) => entry.reason !== "box never closes").length;

  let after = alignAsciiBoxes(stripFingerprint(before, { spellingOnly: !prose }));
  if (withCaveman && file.endsWith(".md")) {
    after = alignAsciiBoxes(compressText(after));
  }
  if (after === before) {
    continue;
  }
  changed += 1;

  const wasHeadings = headings(before);
  const nowHeadings = headings(after);
  for (const [index, heading] of wasHeadings.entries()) {
    if (nowHeadings[index] !== heading) {
      headingChanges.push(`${file}\n    - ${heading}\n    + ${nowHeadings[index]}`);
    }
  }
  if (apply) {
    writeFileSync(file, after);
  }
}

console.log(`${files.length} files scanned, ${changed} would change${apply ? " (written)" : ""}`);
console.log(`  dashes: ${dashes}   typographic: ${typographic}   british spellings: ${british}   ragged box lines: ${raggedLines}`);
if (headingChanges.length > 0) {
  console.log(`\n${headingChanges.length} heading(s) change - these are the routing surface, review them:`);
  for (const change of headingChanges) {
    console.log(`  ${change}`);
  }
}
if (!apply && changed > 0) {
  console.log("\nRe-run with --apply to write.");
}
