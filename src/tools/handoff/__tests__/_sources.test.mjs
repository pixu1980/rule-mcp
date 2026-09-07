/** The handoff sources: ADR parsing edge shapes and context formats. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { readAdrs, readContextValues } from "../_sources.js";

const project = mkdtempSync(join(tmpdir(), "rule-handoff-src-"));

test.before(() => {
  mkdirSync(join(project, "docs", "adr"), { recursive: true });
  mkdirSync(join(project, ".context"), { recursive: true });

  writeFileSync(
    join(project, "docs/adr/010-title-with-hyphen.md"),
    "# 010: A Title With Hyphens\n\n- **Date**: 2026-09-01\n- **Status**: [accepted](link)\n- **Tags**: a,b, c\n\n## Decision\n\nFirst line of the decision.\nSecond line stays.\nThird line is dropped.\n",
  );
  writeFileSync(join(project, "docs/adr/011-status-section.md"), "not a title line\n\n## Status\n\nsuperseded\n\n## Decision\n\nShort.\n");
  writeFileSync(join(project, "docs/adr/012-no-decision.md"), "# 012: Empty Decision\n\n- **Status**: proposed\n");

  writeFileSync(join(project, ".context/base.md"), "**scope**: one\n- **scope**: two\n**count**: 5\n**bare_key**: x\n");
  writeFileSync(join(project, ".context/multi.md"), "- **alpha**: first\n- **alpha**: second\n");
});

test.after(() => rmSync(project, { recursive: true, force: true }));

test("readAdrs parses hyphen titles, markdown status links and two-line decisions", () => {
  const adrs = readAdrs(project);
  const title = adrs.find((a) => a.number === 10);
  assert.equal(title.title, "A Title With Hyphens", "the hyphenated title wins over the slug");
  assert.equal(title.date, "2026-09-01", "the date parses");
  assert.equal(title.status, "accepted", "a markdown status link is stripped");
  assert.deepEqual(title.tags, ["a", "b", "c"], "tags split and whitespace-trim");
  assert.match(title.decision, /First line of the decision\. Second line stays/, "the decision keeps two lines");

  const status = adrs.find((a) => a.number === 11);
  assert.equal(status.title, "status section", "a missing title line falls back to the slug as-is");
  assert.equal(status.status, "superseded", "the ## Status section form parses");
  assert.match(status.decision, /Short/, "the decision parses");

  const empty = adrs.find((a) => a.number === 12);
  assert.equal(empty.decision, "", "a missing decision section is empty");
});

test("readContextValues prefers bullet values and drops count keys from the snapshot path", () => {
  const values = readContextValues(project);
  assert.equal(values.scope, "two", "the bullet form wins over the plain form");
  assert.equal(values.count, "5", "a count value reads");
  assert.equal(values.bare_key, "x", "a plain key reads");
  assert.equal(values.alpha, "second", "the later bullet wins");

  assert.deepEqual(readContextValues(join(project, "no", "ctx")), {}, "a missing context dir reads empty");
});
