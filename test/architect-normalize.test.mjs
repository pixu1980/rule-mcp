// test/architect-normalize.test.mjs
//
// Fix round 1 regression coverage for `normalizeAnswers` (Task 3 review,
// opus): RENAMES must be "fill-if-absent", not "overwrite-if-nonempty".
//
// PROJECT_NAME_SKETCH -> PROJECT_NAME and PROJECT_PITCH_SKETCH ->
// PROJECT_ELEVATOR_PITCH are renames whose TARGET is also a directly
// collected, separate flat wizard field (step-1 rough sketch vs. step-7
// refined final answer - see wizard-spec.json field keys at both the
// `_SKETCH` and the plain-named steps). The original implementation used
// the same "non-empty always wins" helper for RENAMES as for COMPOSITION,
// which meant a present, non-empty sketch value silently overwrote an
// already-answered refined value - regressing the two most prominent
// identity placeholders (`[PROJECT_NAME]`, `[PROJECT_ELEVATOR_PITCH]`)
// across every generated file whenever a user answered both steps (the
// normal path). Fixed: RENAMES now only fill an absent/empty target; a
// present refined answer always wins, and the sketch value is only used as
// a fallback when the refined field was left blank.
//
// COMPOSITION's precedence is intentionally NOT changed by that fix: the
// detailed repeatable group (e.g. FEATURES) must still overwrite its
// flat-fallback rename (TOP_FEATURE_* -> FEATURE_*) when both are present,
// per the plan's documented precedence - asserted here too so a future
// "fix" to RENAMES doesn't accidentally flatten COMPOSITION's precedence
// the same way.
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAnswers } from "../skills/rule-architect/generator.mjs";

test("RENAMES: a present refined PROJECT_NAME wins over the rough PROJECT_NAME_SKETCH", () => {
  const answers = { PROJECT_NAME_SKETCH: "rough sketch name", PROJECT_NAME: "Refined Final Name" };
  const result = normalizeAnswers(answers, null);
  assert.equal(result.PROJECT_NAME, "Refined Final Name");
});

test("RENAMES: PROJECT_NAME_SKETCH is used as a fallback when PROJECT_NAME was never answered", () => {
  const answers = { PROJECT_NAME_SKETCH: "rough sketch name only" };
  const result = normalizeAnswers(answers, null);
  assert.equal(result.PROJECT_NAME, "rough sketch name only");
});

test("RENAMES: a present refined PROJECT_ELEVATOR_PITCH wins over the rough PROJECT_PITCH_SKETCH", () => {
  const answers = {
    PROJECT_PITCH_SKETCH: "rough pitch sketch",
    PROJECT_ELEVATOR_PITCH: "Refined final elevator pitch.",
  };
  const result = normalizeAnswers(answers, null);
  assert.equal(result.PROJECT_ELEVATOR_PITCH, "Refined final elevator pitch.");
});

test("RENAMES: PROJECT_PITCH_SKETCH is used as a fallback when PROJECT_ELEVATOR_PITCH was never answered", () => {
  const answers = { PROJECT_PITCH_SKETCH: "rough pitch sketch only" };
  const result = normalizeAnswers(answers, null);
  assert.equal(result.PROJECT_ELEVATOR_PITCH, "rough pitch sketch only");
});

test("COMPOSITION precedence is unaffected: detailed FEATURES still overwrites the TOP_FEATURE_1 rename fallback", () => {
  const answers = {
    TOP_FEATURE_1: "flat fallback feature",
    FEATURES_count: "1",
    FEATURES_1_feature: "detailed feature one",
  };
  const result = normalizeAnswers(answers, null);
  assert.equal(result.FEATURE_1, "detailed feature one");
});

test("COMPOSITION precedence: TOP_FEATURE_1 rename fallback is used when FEATURES was never answered", () => {
  const answers = { TOP_FEATURE_1: "flat fallback feature only" };
  const result = normalizeAnswers(answers, null);
  assert.equal(result.FEATURE_1, "flat fallback feature only");
});

test("COMPOSITION (P8): the framework-neutral groups expand into their placeholders", () => {
  const answers = {
    ARCHITECTURE_PRINCIPLES_count: "2",
    ARCHITECTURE_PRINCIPLES_1_principle: "Deterministic domain logic",
    ARCHITECTURE_PRINCIPLES_2_principle: "Local-first workflows",
    TECH_CONSTRAINTS_count: "1",
    TECH_CONSTRAINTS_1_constraint: "Zero runtime dependencies",
    GUIDANCE_LINKS_count: "1",
    GUIDANCE_LINKS_1_reference: "[Glossary](./specs/02-domain-glossary.md)",
  };
  const result = normalizeAnswers(answers, null);
  assert.equal(result.ARCH_PRINCIPLE_1, "Deterministic domain logic");
  assert.equal(result.ARCH_PRINCIPLE_2, "Local-first workflows");
  assert.equal(result.TECH_CONSTRAINT_1, "Zero runtime dependencies");
  assert.equal(result.GUIDANCE_LINK_1, "[Glossary](./specs/02-domain-glossary.md)");
});
