

/**
 * @module test/adr-index
 *
 * The ADR index is generated, and there is only one of it.
 *
 * There used to be two - `README.md`, rewritten by `rule_tool_process_adr` on
 * every call, and `DECISIONS.md`, kept by hand and stale from ADR 040 onward.
 * That is the failure ADR 049 named: parallel normative documentation drifts,
 * and the copy nobody executes is the copy that goes stale.
 *
 * The assertion that makes drift impossible is the last one: regenerating the
 * index from the ADR files on disk has to reproduce the committed file exactly.
 *
 * @see src/tools/adr/index.js - buildAdrIndex
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const { buildAdrIndex, listExistingAdrs, ADR_INDEX_FILE } = await import("../index.js");

const adrDir = "docs/adr";
const indexPath = join(adrDir, ADR_INDEX_FILE);
const numbered = readdirSync(adrDir)
  .filter((file) => /^\d{3}-.+\.md$/.test(file))
  .sort();

test("one index file, and the two it replaced are gone", () => {
  assert.equal(ADR_INDEX_FILE, "ADR.md");
  assert.ok(existsSync(indexPath), "docs/adr/ADR.md must exist");
  assert.ok(!existsSync(join(adrDir, "README.md")), "docs/adr/README.md was merged into ADR.md");
  assert.ok(!existsSync(join(adrDir, "DECISIONS.md")), "docs/adr/DECISIONS.md was merged into ADR.md");
});

test("every ADR on disk is listed", () => {
  const index = readFileSync(indexPath, "utf8");
  const missing = numbered.filter((file) => !index.includes(file));

  assert.deepEqual(missing, [], "an ADR file exists that the index does not name");
  console.log(`  ${numbered.length} ADRs listed`);
});

test("the index carries all four sections", () => {
  const index = readFileSync(indexPath, "utf8");
  for (const heading of ["## Index", "## What each decision says", "## By theme", "## Operating rules"]) {
    assert.ok(index.includes(heading), `the index must carry ${heading}`);
  }
});

test("no table cell breaks the table", () => {
  const rows = readFileSync(indexPath, "utf8")
    .split("\n")
    .filter((line) => line.startsWith("| ["));
  for (const row of rows) {
    const cells = row.split(/(?<!\\)\|/).length - 2;
    assert.ok(cells === 5 || cells === 3, `a generated row has ${cells} cells: ${row.slice(0, 80)}`);
  }
});

test("regenerating from disk reproduces the committed file", () => {
  const generated = buildAdrIndex(listExistingAdrs(adrDir));

  assert.equal(generated, readFileSync(indexPath, "utf8"), "run rule_tool_process_adr, or regenerate the index");
});

test("an ADR that changes another one is named by the one it changed", () => {
  // Outside practice puts this first: the most common defect in a real ADR
  // directory is a decision reversed without anyone writing it down, with the
  // earlier record still reading accepted. This repository had one - 069 kept
  // its definitions while 074, 078 and 079 replaced them - so the backlink is
  // a gate rather than a habit.
  const files = readdirSync(adrDir).filter((name) => /^\d{3}-/.test(name));
  const bodies = new Map(files.map((name) => [name.slice(0, 3), readFileSync(join(adrDir, name), "utf8")]));
  const orphans = [];

  for (const [number, text] of bodies) {
    for (const [, target] of text.matchAll(/\b(?:supersedes|supersede|updates|replaces)\s+(?:\[?ADR\s*)?(\d{3})/gi)) {
      if (!(bodies.get(target) ?? "").includes(number)) {
        orphans.push(`${number} says it changes ${target}, and ${target} never mentions ${number}`);
      }
    }
  }

  assert.deepEqual(orphans, [], "a reader who finds the earlier decision first has to be sent to the later one");
});

test("a new ADR is asked what would end it", async () => {
  // Outside practice: write the drift triggers while you still remember which
  // assumptions the decision leans on. Nothing here did, so a decision was only
  // ever noticed as stale by accident - 069 kept its definitions for three ADRs.
  const { buildAdrBody } = await import("../index.js");
  const withAnswer = buildAdrBody({
    number: "099",
    title: "A decision that says when it ends",
    date: "2026-09-04",
    status: "accepted",
    tags: ["fixture"],
    decision: "Do the thing.",
    endsWhen: "The registry stops being able to count itself.",
  });

  assert.match(withAnswer, /## What would end this/, "the section is part of the template");
  assert.match(withAnswer, /registry stops being able to count itself/, "and carries the author's answer");

  const withoutAnswer = buildAdrBody({
    number: "100",
    title: "A decision that does not",
    date: "2026-09-04",
    status: "accepted",
    tags: ["fixture"],
  });

  assert.match(withoutAnswer, /## What would end this/, "the question is asked even when unanswered");
  assert.match(withoutAnswer, /assumption/i, "and the prompt says what kind of answer it wants");
});
