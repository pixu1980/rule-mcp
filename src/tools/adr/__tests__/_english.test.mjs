/**
 * @module test/adr-english
 *
 * An ADR is written in English, filename included.
 *
 * ADR 060 landed as `060-riorganizzare-scripts-src-test-...` with an Italian
 * title and body, because nothing between the tool schema and the file writer
 * checked the language (the schema's own example title was Italian). The gate
 * below runs before a file is written: the exact title and prose that slipped
 * through are the regression fixtures.
 */

import test from "node:test";
import assert from "node:assert/strict";

const { adrEnglishOffenses } = await import("../../../../src/tools/adr/index.js");

test("the Italian title that produced ADR 060 is rejected", () => {
  const offenses = adrEnglishOffenses({
    title: "Riorganizzare scripts/src/test in sottocartelle tematiche con code splitting a 150 righe",
  });

  assert.ok(offenses.length > 0, "the ADR 060 title must be flagged as non-English");
});

test("Italian prose in the decision body is rejected", () => {
  const offenses = adrEnglishOffenses({
    title: "Reorganize scripts into thematic subfolders",
    decision:
      "Riorganizzare scripts/, src/ e test/ in sottocartelle tematiche per funzionalità; applicare code splitting.",
  });

  assert.ok(offenses.length > 0, "Italian decision prose must be flagged");
  assert.ok(
    offenses.some((offense) => offense.startsWith("decision:")),
    "the offense names the field it was found in",
  );
});

test("an English ADR passes untouched", () => {
  const offenses = adrEnglishOffenses({
    title: "Use PostgreSQL as the primary database",
    context: "The service outgrew SQLite: concurrent writers block each other under load.",
    decision: "Adopt PostgreSQL 16 with pgbouncer; migrations run through the existing tooling.",
    consequences: "Positive: real concurrency. Negative: one more service to operate.",
    alternatives: ["Keep SQLite with WAL", "MySQL 8"],
  });

  assert.deepEqual(offenses, [], "English fields produce no offenses");
});

test("the tool schema no longer advertises an Italian example title", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync("src/tools/adr/index.js", "utf8");

  assert.ok(!source.includes("Usare PostgreSQL come database"), "the zod example title must be English");
});
