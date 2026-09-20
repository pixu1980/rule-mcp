/**
 * `docs/handoff/HANDOFF.md`: the generated index of the handoff family.
 *
 * Like `docs/adr/ADR.md`, the index is derived from the files on disk: the
 * doctor creates it when the family has documents and no index, reorders it
 * when rows are appended out of order, and never touches a family whose
 * directory is absent.
 */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { applyRenumber, planRenumber } from "../../../src/core/docs-numbering/index.js";
import { listExistingHandoffs } from "../../../src/tools/handoff/_handoff-index.js";
import { seedHandoffs } from "./_doctor.fixture.mjs";

test("the handoff index reads all three header shapes", () => {
  const root = seedHandoffs();

  try {
    const byNumber = new Map(listExistingHandoffs(join(root, "docs", "handoff")).map((entry) => [entry.number, entry]));

    assert.equal(byNumber.size, 3, "every numbered handoff is read");
    assert.equal(byNumber.get(1).title, "the oldest shape", "the `NN - topic` heading loses its number");
    assert.equal(byNumber.get(1).branch, "perf/meta-surface", "the branch keeps its name and drops the aside");
    assert.equal(byNumber.get(1).date, "2026-09-09");
    assert.equal(byNumber.get(2).title, "the middle shape", "the `Session handoff NN -` heading loses its prefix");
    assert.equal(byNumber.get(2).branch, "main");
    assert.equal(byNumber.get(3).title, "the newest shape", "the `Handoff:` heading loses its prefix");
    assert.equal(byNumber.get(3).date, "2026-09-11");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a missing handoff index is planned", () => {
  const root = seedHandoffs();

  try {
    const plan = planRenumber({ projectDir: root });

    assert.equal(plan.handoffIndexStale, true, "there is no HANDOFF.md yet");
    assert.equal(plan.handoffIndexUnordered, false, "and nothing to reorder");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applying creates docs/handoff/HANDOFF.md, newest first", () => {
  const root = seedHandoffs();

  try {
    const result = applyRenumber(planRenumber({ projectDir: root }), { projectDir: root });

    assert.equal(result.handoffIndexRegenerated, true, "the result says the index was created");

    const index = readFileSync(join(root, "docs", "handoff", "HANDOFF.md"), "utf8");
    const rows = [...index.matchAll(/^\| \[(\d+)\]/gm)].map((match) => Number(match[1]));

    assert.deepEqual(rows, [3, 2, 1], "every handoff is listed, newest first");
    assert.match(index, /the newest shape/, "the row carries the parsed title");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a regenerated handoff index is what the generator would write", () => {
  const root = seedHandoffs();

  try {
    applyRenumber(planRenumber({ projectDir: root }), { projectDir: root });

    const second = planRenumber({ projectDir: root });

    assert.equal(second.handoffIndexStale, false, "regenerating twice finds nothing to do");
    assert.equal(second.handoffIndexUnordered, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an out-of-order handoff index is reported and rebuilt", () => {
  const root = seedHandoffs();

  try {
    writeFileSync(
      join(root, "docs", "handoff", "HANDOFF.md"),
      [
        "# Session Handoffs",
        "",
        "| #                      | Title | Date       | Branch |",
        "| ---------------------- | ----- | ---------- | ------ |",
        "| [01](01-old-style.md)  | one   | 2026-09-09 | main   |",
        "| [03](03-handoff-prefix.md) | three | 2026-09-11 | main |",
        "",
      ].join("\n"),
    );

    const plan = planRenumber({ projectDir: root });

    assert.equal(plan.handoffIndexUnordered, true, "01 sits above 03");

    applyRenumber(plan, { projectDir: root });

    const rows = [...readFileSync(join(root, "docs", "handoff", "HANDOFF.md"), "utf8").matchAll(/^\| \[(\d+)\]/gm)].map((match) => Number(match[1]));

    assert.deepEqual(rows, [3, 2, 1], "the rebuilt index runs newest first");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a project with no handoff directory gets no index", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-doctor-no-handoffs-"));

  try {
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(join(root, "docs", "adr", "001-one.md"), "# 001: One\n\n- **Status**: accepted\n");

    const plan = planRenumber({ projectDir: root });

    assert.equal(plan.handoffIndexStale, false, "there is no family to index");

    applyRenumber(plan, { projectDir: root });

    assert.equal(existsSync(join(root, "docs", "handoff")), false, "and no directory is conjured up");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
