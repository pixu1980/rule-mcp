// test/architect-fill-coverage.test.mjs
//
// Two gates for the Phase 4 fill-wiring work:
//
// 1. A design-readiness gate over the MAPPING DATA in
//    `skills/rule-architect/field-map.mjs` — is the declared design
//    (RENAMES + COMPOSITION + DERIVED), combined with wizard fields that
//    already share an identical name with a template placeholder, enough to
//    account for every MEANINGFUL placeholder in templates.json?
//
//    "Meaningful" = every `[KEY]`-shaped token in templates.json, minus JUNK
//    (literal prose, not real placeholders) minus DEFER_PHASE5 (deliberately
//    deferred to Phase 5 — no interview source in this phase).
//
// 2. Task 3's real runtime-fill gate: feed the fully-answered fixture
//    through `normalizeAnswers` (RENAMES + COMPOSITION + DERIVED applied)
//    then `generateContextContent`, and assert >=95% of meaningful
//    placeholders resolve to a real value (no `**[KEY]**` marker left).
//    Before Task 3 this ran the fixture through the UNWIRED generator and
//    measured ~32% (39/122) as an enforced pre-implementation baseline
//    (fix round 1, Finding 1 — the original `pct > 0`/`pct >= 0` assertions
//    could never fail); Task 3 replaces that baseline with the wired gate.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  RENAMES,
  COMPOSITION,
  DERIVED,
  DEFER_PHASE5,
  JUNK,
  GENERATOR_DERIVED,
} from "../skills/rule-architect/field-map.mjs";
import { generateContextContent, normalizeAnswers } from "../skills/rule-architect/generator.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const templates = JSON.parse(readFileSync(join(ROOT, "skills/rule-architect/templates.json"), "utf-8"));
const spec = JSON.parse(readFileSync(join(ROOT, "skills/rule-architect/wizard-spec.json"), "utf-8"));
const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures/architect-full-answers.json"), "utf-8"));

// Same placeholder regex the generator uses, so this test tracks it exactly.
const PLACEHOLDER_RE = /\[([A-Z_0-9]+)\]/g;

function allTemplatePlaceholders() {
  const found = new Set();
  for (const tmpl of templates) {
    for (const match of tmpl.content.matchAll(PLACEHOLDER_RE)) {found.add(match[1]);}
  }
  return found;
}

// Wizard flat fields (non-repeatable) — a placeholder is "already-collected"
// if a flat wizard field key matches it verbatim (no wiring required).
function flatWizardKeys() {
  const keys = new Set();
  for (const step of spec.steps) {
    for (const field of step.fields) {
      if (field.type !== "repeatable" && field.type !== "entity-list") {keys.add(field.key);}
    }
  }
  return keys;
}

// Does `key` match a COMPOSITION template/alias pattern for some integer i?
function matchesComposition(key) {
  for (const rule of COMPOSITION) {
    for (const pattern of [rule.template, ...(rule.aliases || [])]) {
      const re = new RegExp("^" + pattern.replace("{i}", String.raw`(\d+)`) + "$");
      if (re.test(key)) {return true;}
    }
  }
  return false;
}

test("field-map + already-collected flat keys cover every meaningful placeholder (0 uncovered)", () => {
  const allPlaceholders = allTemplatePlaceholders();
  assert.ok(allPlaceholders.size > 0, "templates.json should contain placeholders");

  const meaningful = [...allPlaceholders].filter((k) => !JUNK.has(k) && !DEFER_PHASE5.has(k));
  assert.ok(meaningful.length > 0, "there should be meaningful placeholders left after excluding JUNK/DEFER_PHASE5");

  const renameTargets = new Set(Object.values(RENAMES));
  const derivedTargets = new Set(DERIVED.map((d) => d.template));
  const flatKeys = flatWizardKeys();

  const covered = [];
  const uncovered = [];
  for (const key of meaningful) {
    const isCovered =
      flatKeys.has(key) ||
      renameTargets.has(key) ||
      matchesComposition(key) ||
      derivedTargets.has(key) ||
      GENERATOR_DERIVED.has(key);
    (isCovered ? covered : uncovered).push(key);
  }

  const pct = (covered.length / meaningful.length) * 100;

  console.log(`\narchitect fill-coverage baseline (design-level, pre-Task-3):`);
  console.log(`  total placeholders in templates.json: ${allPlaceholders.size}`);
  console.log(`  JUNK: ${JUNK.size}, DEFER_PHASE5: ${DEFER_PHASE5.size}`);
  console.log(`  meaningful: ${meaningful.length}`);
  console.log(`  covered by field-map + flat keys: ${covered.length}`);
  console.log(`  baseline coverage: ${pct.toFixed(1)}%`);
  if (uncovered.length > 0) {
    console.log(`  UNCOVERED (${uncovered.length}): ${uncovered.sort().join(", ")}`);
  }

  assert.equal(
    uncovered.length,
    0,
    `every meaningful placeholder must be covered by RENAMES/COMPOSITION/DERIVED/flat-keys — uncovered: ${uncovered.sort().join(", ")}`
  );
});

test("normalizeAnswers + generateContextContent fill >=95% of meaningful placeholders on the full fixture", () => {
  // This is the REAL post-Task-3 fill: run the fixture through
  // normalizeAnswers (RENAMES + COMPOSITION + DERIVED) before handing it to
  // generateContextContent — the same order both generator entry points
  // apply internally — and check how many meaningful placeholders no longer
  // carry the unfilled `**[KEY]**` marker anywhere in the generated output.
  const allPlaceholders = allTemplatePlaceholders();
  const meaningful = [...allPlaceholders].filter((k) => !JUNK.has(k) && !DEFER_PHASE5.has(k));

  const normalized = normalizeAnswers(fixture, spec);
  const files = generateContextContent(normalized, spec);
  // Phase 5 removed the `**[KEY]**` marker, so looking for it would make this
  // gate pass vacuously. A placeholder now counts as unfilled when the lean
  // policy had to fall back to a TODO marker for it, or when its raw token
  // somehow survived. `TEMPLATE_GUIDE.md` is a `raw` template that documents
  // the placeholder syntax, so its literal tokens are excluded.
  const combined = files
    .filter((f) => f.path !== "TEMPLATE_GUIDE.md")
    .map((f) => f.content)
    .join("\n");

  const unfilled = [];
  for (const key of meaningful) {
    if (combined.includes(`[${key}]`) || combined.includes(`TODO: ${key}`)) {unfilled.push(key);}
  }
  const filled = meaningful.length - unfilled.length;
  const pct = (filled / meaningful.length) * 100;

  console.log(`\narchitect wired fill (post-Task-3, normalizeAnswers applied): ${filled}/${meaningful.length} = ${pct.toFixed(1)}%`);
  if (unfilled.length > 0) {
    console.log(`  still unfilled (${unfilled.length}): ${unfilled.sort().join(", ")}`);
  }

  assert.ok(
    pct >= 95,
    `wired fill should be >=95% of meaningful placeholders (got ${pct.toFixed(1)}%) — still unfilled: ${unfilled.sort().join(", ")}`
  );
});
