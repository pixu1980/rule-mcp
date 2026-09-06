/**
 * The English-only + American-spelling mandate (hardening request: "always
 * English, always US spelling, on every prompt and every generated file").
 *
 * Every guardrail is wired so rule_tool_check enforces it on EVERY skill, a
 * dedicated skill carries the house rules + the canonical wordlist, and every
 * prompt/command surface announces the mandate so agents inherit it before a
 * single check runs.
 *
 * Pinned here:
 *   - `fp-american-english` (British → US) and `en-english-only-prose`
 *     (foreign-language prose) both run for EVERY skill;
 *   - comments and identifiers with non-English content are flagged, English
 *     ones pass;
 *   - a generated markdown document is checked as whole-prose in docs mode;
 *   - the rule-styleguide-english skill exists, is routed, and its advertised
 *     US/UK pairs are exactly the ones the fingerprint dictionary catches
 *     (no drift between what a skill tells a model and what the gate blocks);
 *   - every shared prompt/command surface carries the mandate.
 */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { getGuardrails, checkCode } from "../../src/core/guardrails.js";
import { findFingerprints } from "../../src/core/text/_fingerprint.js";
import { loadAllSkills } from "../../src/core/skills.js";

await loadAllSkills(true);

const SKILLS = [
  "rule-frontend-react",
  "rule-backend-express",
  "rule-data-postgresql",
  "rule-devops-docker",
  "rule-styleguide",
  "rule-toolchain-pnpm",
];

for (const skill of SKILLS) {
  test(`every skill carries the English guardrails (${skill})`, () => {
    const ids = new Set(getGuardrails(skill).map((g) => g.id));
    assert.ok(ids.has("fp-american-english"), `${skill}: fp-american-english must run`);
    assert.ok(ids.has("en-english-only-prose"), `${skill}: en-english-only-prose must run`);
    assert.ok(ids.has("en-english-only-filenames"), `${skill}: en-english-only-filenames must run`);
  });
}

test("English comments pass, non-English comments are flagged", () => {
  const good = checkCode("rule-styleguide-javascript", "// renders the totals in a table\nexport const rows = [];\n", {
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
    const result = checkCode("rule-styleguide-javascript", `${comment}\nexport const rows = [];\n`, {
      fileName: "x.js",
    });
    const rule = result.failed.find((r) => r.id === "en-english-only-prose");
    assert.ok(rule, `${language}: en-english-only-prose must fire`);
    assert.ok(rule.detail.length > 0, `${language}: the offender is named`);
  }
});

test("a foreign function word in an identifier is flagged", () => {
  const bad = checkCode("rule-styleguide-javascript", "export const dellaTabella = rows;\n", { fileName: "x.js" });
  const badRule = bad.failed.find((r) => r.id === "en-english-only-prose");
  assert.ok(badRule, "an identifier token that is a foreign function word must fire");

  const good = checkCode("rule-styleguide-javascript", "export const tableRows = rows;\n", { fileName: "x.js" });
  assert.equal(
    good.failed.find((r) => r.id === "en-english-only-prose"),
    undefined,
    "English identifiers pass",
  );
});

test("a generated markdown document is checked as whole prose", () => {
  const md = "# Audit\n\nEvidence collected during the run, senza opinioni personali.\n";
  const flagged = checkCode("rule-styleguide-markdown", md, { fileName: "docs/audits/security.md" });
  assert.ok(
    flagged.failed.find((r) => r.id === "en-english-only-prose"),
    "Italian prose in a .md document must fire",
  );

  const clean = checkCode(
    "rule-styleguide-markdown",
    "# Audit\n\nEvidence collected during the run, with no personal opinions.\n",
    {
      fileName: "docs/audits/security.md",
    },
  );
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

test("the rule-styleguide-english skill exists and is routed", async () => {
  const skillDir = "skills/rule-styleguide-english";
  assert.ok(existsSync(join(skillDir, "SKILL.md")), `${skillDir}/SKILL.md exists`);

  const { parseSkillFrontmatter } = await import("../../src/core/skills.js");
  const meta = parseSkillFrontmatter(readFileSync(join(skillDir, "SKILL.md"), "utf8"));
  assert.equal(meta.name, "rule-styleguide-english", "frontmatter name matches the directory");
  assert.match(meta.description, /english/i, "the description advertises English/American spelling");

  const { callTool } = await import("../../src/tools/router/index.js");
  const answer = JSON.parse(
    (await callTool("pix_tool", { prompt: "americanize this comment: colour -> color, behaviour -> behavior" }))
      .content[0].text,
  );
  assert.match(
    `${answer.route} ${(answer.alternatives ?? []).map((a) => a.route).join(" ")}`,
    /styleguide-english/,
    "an americanize/english-spelling prompt routes to the skill",
  );
});

test("the skill's wordlist matches the fingerprint dictionary exactly (no drift)", () => {
  const skillText = readFileSync("skills/rule-styleguide-english/SKILL.md", "utf8");
  const pairs = [...skillText.matchAll(/^- ([a-z]+) → ([a-z]+)$/gim)].map((m) => [
    m[1].toLowerCase(),
    m[2].toLowerCase(),
  ]);
  assert.ok(pairs.length >= 4, "the skill advertises the key UK→US pairs");

  for (const [uk, us] of pairs) {
    const { british } = findFingerprints(`the word ${uk} here`);
    assert.ok(
      british.includes(uk),
      `fingerprint dictionary must flag "${uk}" so the skill's "${uk} -> ${us}" stays honest`,
    );
    assert.ok(!british.includes(us), `the US form "${us}" must not be flagged`);
  }
});

test("every shared prompt/command surface carries the English mandate", async () => {
  const { commandDefinition } = await import("../../src/core/agents/_commands.js");
  const surfaces = [
    ["router command", commandDefinition("rule").body],
    ["handoff command", commandDefinition("rule-handoff").body],
  ];
  for (const [label, body] of surfaces) {
    assert.match(body, /American spelling|American English|US spelling/i, `${label} must carry the mandate`);
  }

  const { fillRoleTemplate } = await import("../../src/core/review/_template.js");
  const { roleById } = await import("../../src/core/review/_roles.js");
  const filled = fillRoleTemplate(roleById("security"));
  assert.match(filled, /American spelling|English/i, "the persona template carries the mandate");
});

test("file and folder names must be English", () => {
  const source = "export const x = 1;\n";

  const english = checkCode("rule-styleguide-javascript", source, {
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
    const result = checkCode("rule-styleguide-javascript", source, { fileName });
    const rule = result.failed.find((r) => r.id === "en-english-only-filenames");
    assert.ok(rule, `${label} ("${fileName}") must fail en-english-only-filenames`);
  }

  const noName = checkCode("rule-styleguide-javascript", source, {});
  assert.equal(
    noName.failed.find((r) => r.id === "en-english-only-filenames"),
    undefined,
    "no fileName in context means nothing to check",
  );
});
