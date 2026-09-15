// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** The guardrails: wiring on every skill, prose, identifiers, docs, spellings, filenames. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { checkCode, findFingerprints, getGuardrails } from "./_english.fixture.mjs";

const SKILLS = ["pix-frontend-react", "pix-backend-express", "pix-data-postgresql", "pix-devops-docker", "pix-styleguide", "pix-toolchain-pnpm"];

for (const skill of SKILLS) {
  test(`every skill carries the English guardrails (${skill})`, () => {
    const ids = new Set(getGuardrails(skill).map((g) => g.id));
    assert.ok(ids.has("fp-american-english"), `${skill}: fp-american-english must run`);
    assert.ok(ids.has("en-english-only-prose"), `${skill}: en-english-only-prose must run`);
    assert.ok(ids.has("en-english-only-filenames"), `${skill}: en-english-only-filenames must run`);
  });
}

test("English comments pass, non-English comments are flagged", () => {
  const good = checkCode("pix-styleguide-javascript", "// renders the totals in a table\nexport const rows = [];\n", {
    fileName: "x.js",
  });
  const goodRule = good.failed.find((r) => r.id === "en-english-only-prose");
  assert.equal(goodRule, undefined, "an English comment must pass");

  for (const [language, comment] of [
    ["Italian", "// questo commento è in italiano, per favore"],
    ["German", "// dieses Kommentar ist auf Deutsch geschrieben"],
    ["French", "// ce commentaire est écrit en français"],
    ["Spanish", "// este comentario está escrito en español"],
  ]) {
    const result = checkCode("pix-styleguide-javascript", `${comment}\nexport const rows = [];\n`, {
      fileName: "x.js",
    });
    const rule = result.failed.find((r) => r.id === "en-english-only-prose");
    assert.ok(rule, `${language}: en-english-only-prose must fire`);
    assert.ok(rule.detail.length > 0, `${language}: the offender is named`);
  }
});

test("a foreign function word in an identifier is flagged", () => {
  const bad = checkCode("pix-styleguide-javascript", "export const dellaTabella = rows;\n", { fileName: "x.js" });
  const badRule = bad.failed.find((r) => r.id === "en-english-only-prose");
  assert.ok(badRule, "an identifier token that is a foreign function word must fire");

  const good = checkCode("pix-styleguide-javascript", "export const tableRows = rows;\n", { fileName: "x.js" });
  assert.equal(
    good.failed.find((r) => r.id === "en-english-only-prose"),
    undefined,
    "English identifiers pass",
  );
});

test("a generated markdown document is checked as whole prose", () => {
  const md = "# Audit\n\nEvidence collected during the run, senza opinioni personali.\n";
  const flagged = checkCode("pix-styleguide-markdown", md, { fileName: "docs/audits/security.md" });
  assert.ok(
    flagged.failed.find((r) => r.id === "en-english-only-prose"),
    "Italian prose in a .md document must fire",
  );

  const clean = checkCode("pix-styleguide-markdown", "# Audit\n\nEvidence collected during the run, with no personal opinions.\n", {
    fileName: "docs/audits/security.md",
  });
  assert.equal(
    clean.failed.find((r) => r.id === "en-english-only-prose"),
    undefined,
    "English docs pass",
  );
});

test("British spellings are still flagged, including internationalised", () => {
  const { british } = findFingerprints("the colour behaviour of the neighbour was internationalised");
  assert.ok(british.includes("colour"), "colour -> color");
  assert.ok(british.includes("behaviour"), "behaviour -> behavior");
  assert.ok(british.includes("neighbour"), "neighbour -> neighbor");
  assert.ok(british.includes("internationalised"), "internationalised -> internationalized");
});

test("file and folder names must be English", () => {
  const source = "export const x = 1;\n";

  const english = checkCode("pix-styleguide-javascript", source, {
    fileName: "src/components/user-table/summary-report.js",
  });
  assert.equal(
    english.failed.find((r) => r.id === "en-english-only-filenames"),
    undefined,
    "an English path must pass",
  );

  for (const [label, fileName] of [
    ["Italian kebab-case segments", "src/components/tabella-utenti/riepilogo.js"],
    ["Italian folder name", "src/cartella/index.js"],
    ["accented file name", "src/città.js"],
    ["Italian camelCase file name", "src/helpers/aggiungiElemento.js"],
  ]) {
    const result = checkCode("pix-styleguide-javascript", source, { fileName });
    const rule = result.failed.find((r) => r.id === "en-english-only-filenames");
    assert.ok(rule, `${label} ("${fileName}") must fail en-english-only-filenames`);
  }

  const noName = checkCode("pix-styleguide-javascript", source, {});
  assert.equal(
    noName.failed.find((r) => r.id === "en-english-only-filenames"),
    undefined,
    "no fileName in context means nothing to check",
  );
});
