// test/architect-lean-output.test.mjs
//
// Phase 5 gates — "lean + conditional" generated output.
//
// The invariant: a generated pack must never ship a raw `[KEY]` or a bold
// `**[KEY]**` unfilled-placeholder marker, and making it lean must not
// corrupt the files it touches. Every assertion here is bound to a real
// hazard found by rendering the committed fixture through the generator:
//
//   - `schemas/ruleset.schema.json` is JSON, and all of its placeholders sit
//     INSIDE string values. Dropping lines that carry an unfilled placeholder
//     produces invalid JSON ("Expected double-quoted property name").
//   - `TEMPLATE_GUIDE.md` documents the placeholder system itself; its
//     examples must survive VERBATIM (`[PROJECT_NAME] -> "Project Tracker"`),
//     so it is a `raw: true` template that skips substitution entirely.
//   - JUNK tokens (`[X]`, `[NN]`) are literal prose inside fenced code
//     blocks, not placeholders (see field-map.mjs) — they must not be
//     rewritten or bolded.
//   - `analysis/implementation-roadmap.md` carries several placeholders per
//     table row; dropping a row would delete a real milestone.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JUNK } from "../skills/rule-architect/field-map.mjs";
import { generateContextContent } from "../skills/rule-architect/generator.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const spec = JSON.parse(readFileSync(join(ROOT, "skills/rule-architect/wizard-spec.json"), "utf-8"));
const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures/architect-full-answers.json"), "utf-8"));

const BRACKET_TOKEN_RE = /\[([A-Z_0-9]+)\]/g;

function render(answers = fixture) {
  return generateContextContent(answers, spec);
}

function byPath(files, path) {
  const file = files.find((f) => f.path === path);
  assert.ok(file, `expected the pack to contain ${path}`);
  return file;
}

// Bracket tokens are legitimate in two places only: JUNK literals, and any
// template that opted out of substitution (`raw: true`). Everything else is
// an unfilled placeholder that leaked into shipped output.
function leakedTokens(file, rawPaths) {
  if (rawPaths.has(file.path)) {
    return [];
  }
  return [...file.content.matchAll(BRACKET_TOKEN_RE)].map((m) => m[1]).filter((key) => !JUNK.has(key));
}

function rawTemplatePaths() {
  const templates = JSON.parse(readFileSync(join(ROOT, "skills/rule-architect/templates.json"), "utf-8"));
  return new Set(templates.filter((t) => t.raw).map((t) => t.output || t.path.replace(/^templates\//, "")));
}

test("no bold **[KEY]** unfilled marker survives anywhere in the pack", () => {
  const offenders = render()
    .map((f) => ({ path: f.path, hits: (f.content.match(/\*\*\[[A-Z_0-9]+\]\*\*/g) || []).length }))
    .filter((f) => f.hits > 0);

  assert.deepEqual(
    offenders,
    [],
    `the bold unfilled marker must be gone: ${offenders.map((o) => `${o.path} (${o.hits})`).join(", ")}`,
  );
});

test("no unfilled [KEY] token leaks into shipped output (JUNK and raw templates excepted)", () => {
  const rawPaths = rawTemplatePaths();
  const offenders = render()
    .map((f) => ({ path: f.path, keys: [...new Set(leakedTokens(f, rawPaths))] }))
    .filter((f) => f.keys.length > 0);

  assert.deepEqual(
    offenders,
    [],
    `bracket tokens leaked: ${offenders.map((o) => `${o.path} -> ${o.keys.join(",")}`).join(" | ")}`,
  );
});

// The JSON schema is gated behind PROJECT_TYPE=other, so the risky case is
// exactly that: emitted, and sparsely filled.
const rulesetAnswers = { ...fixture, PROJECT_TYPE: "other" };

test("JSON output stays parseable after the lean policy runs", () => {
  const json = byPath(render(rulesetAnswers), "schemas/ruleset.schema.json");
  assert.doesNotThrow(
    () => JSON.parse(json.content),
    "schemas/ruleset.schema.json must remain valid JSON — line-dropping breaks it",
  );
  assert.doesNotMatch(json.content, BRACKET_TOKEN_RE, "no bracket token may survive in the schema");
});

test("emitWhen gates the domain-overfit templates on PROJECT_TYPE", () => {
  const gated = ["specs/03-calculation-engine.md", "specs/04-ruleset-config.md", "schemas/ruleset.schema.json"];

  const generic = new Set(render({ ...fixture, PROJECT_TYPE: "webapp" }).map((f) => f.path));
  for (const path of gated) {
    assert.ok(!generic.has(path), `${path} must be omitted for a generic project`);
  }

  const domain = new Set(render(rulesetAnswers).map((f) => f.path));
  for (const path of gated) {
    assert.ok(domain.has(path), `${path} must be emitted for PROJECT_TYPE=other`);
  }

  // Ungated templates are unaffected either way.
  assert.ok(generic.has("AGENTS.md") && domain.has("AGENTS.md"));
  assert.ok(generic.has("specs/00-sdd.md") && domain.has("specs/00-sdd.md"));
});

test("a malformed emitWhen fails loudly instead of silently omitting a file", async () => {
  const { shouldEmit } = await import("../skills/rule-architect/generator.mjs");
  assert.ok(shouldEmit({ output: "x.md" }, {}), "no gate means always emit");
  assert.throws(() => shouldEmit({ output: "x.md", emitWhen: { in: ["other"] } }, {}), /needs a "field"/);
  assert.throws(
    () => shouldEmit({ output: "x.md", emitWhen: { field: "PROJECT_TYPE" } }, {}),
    /needs "in" or "equals"/,
  );
});

test("TEMPLATE_GUIDE.md keeps its placeholder documentation verbatim", () => {
  const guide = byPath(render(), "TEMPLATE_GUIDE.md");
  // It teaches the syntax, so the literal tokens are the content.
  assert.match(guide.content, /\[PROJECT_NAME\]/, "the guide must still show [PROJECT_NAME] literally");
  assert.doesNotMatch(
    guide.content,
    /Sample Project Name/,
    "the guide must NOT have the fixture's project name substituted into its examples",
  );
});

test("JUNK tokens stay verbatim and unbolded", () => {
  const adr = byPath(render(), "specs/07-architecture-decision-records.md");
  assert.match(adr.content, /# ADR \[NN\]: \[Title\]/, "the ADR template example must read [NN], not **[NN]**");
  assert.doesNotMatch(adr.content, /\*\*\[NN\]\*\*/, "JUNK must never be bolded");
});

test("fenced code blocks are left untouched by the lean policy", () => {
  const roadmap = byPath(render(), "analysis/implementation-roadmap.md");
  // A fence's line count is structural: dropping a line inside one would
  // desync the example. Every fence must still open and close.
  for (const file of render()) {
    const fences = (file.content.match(/^\s*```/gm) || []).length;
    assert.equal(fences % 2, 0, `${file.path} has an unbalanced code fence (${fences})`);
  }
  assert.ok(roadmap.content.length > 0);
});

test("table rows are never dropped — milestones survive with their real text", () => {
  const roadmap = byPath(render(), "analysis/implementation-roadmap.md");
  // M5.1's row carries four EDGE_CASE_* placeholders, all unfilled in the
  // fixture; the row itself is real content and must stay.
  assert.match(roadmap.content, /M5\.1/, "milestone M5.1's table row must survive");
  assert.match(roadmap.content, /M3\.4/, "milestone M3.4's table row must survive");
});

test("an all-unfilled section keeps its heading and gets one explicit TODO", () => {
  const adr = byPath(render(), "specs/07-architecture-decision-records.md");
  assert.match(adr.content, /^## ADR Location$/m, "the heading must survive as scaffold");
  // Exactly one TODO line for the section, not one per placeholder.
  const section = adr.content.split(/^## /m).find((s) => s.startsWith("ADR Location"));
  assert.ok(section, "ADR Location section must exist");
  const todos = (section.match(/TODO/g) || []).length;
  assert.equal(todos, 1, `expected exactly one TODO in the ADR Location section, got ${todos}`);
});

test("an empty-string answer counts as unfilled, not as filled (F8)", () => {
  // QUALITY_GATES renders as "- Quality gates: [QUALITY_GATES]" in AGENTS.md.
  // Treating "" as FILLED (today's `val || ""` substitution) leaves a dangling
  // "- Quality gates:" label with nothing after it — which reads as a fact
  // ("there are no quality gates") rather than as missing information.
  const blanked = { ...fixture, QUALITY_GATES: "" };
  const agents = byPath(render(blanked), "AGENTS.md");

  assert.doesNotMatch(agents.content, /\[QUALITY_GATES\]/, "must not leave a raw token");
  assert.doesNotMatch(
    agents.content,
    /^- Quality gates:\s*$/m,
    "an empty answer must drop the whole line, not leave a dangling label",
  );
});

test("an unfilled placeholder inside inline code does not trap the marker underscores", () => {
  // `- Preview: `[PREVIEW_COMMAND]`` must not render as `- Preview:
  // `_TODO: PREVIEW_COMMAND_`` — inside a code span the italic marker's
  // underscores are literal. The backticks are dropped so the marker is prose.
  for (const file of render()) {
    assert.doesNotMatch(
      file.content,
      /`_TODO:[^`]*_`/,
      `${file.path} has an italic TODO marker trapped inside an inline-code span`,
    );
  }
  const agents = byPath(render(), "AGENTS.md");
  assert.match(agents.content, /- Preview: _TODO: PREVIEW_COMMAND_/, "backticks dropped, marker reads as prose");
});

test("no run of three or more consecutive newlines in any emitted file", () => {
  const offenders = render()
    .filter((f) => /\n{3,}/.test(f.content))
    .map((f) => f.path);
  assert.deepEqual(offenders, [], `blank-line runs must be collapsed: ${offenders.join(", ")}`);
});
