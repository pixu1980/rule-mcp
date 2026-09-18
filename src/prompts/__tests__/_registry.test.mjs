

/** The prompt registry: names, order, coverage, strict schemas. */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { EXPECTED, ONE_SHOT_PROMPTS, names, prompts } from "./_prompts.fixture.mjs";

test("names are unique and kebab-case", () => {
  assert.equal(new Set(names).size, names.length, "prompt names must be unique");
  for (const n of names) {
    assert.match(n, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${n} must be kebab-case`);
  }
});

test("prompts are listed in alphabetical order", () => {
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(names, sorted, "prompt names must be listed alphabetically");
});

test("registry covers workflow, area, one-shot, and persona prompts", () => {
  for (const expected of [...EXPECTED, ...ONE_SHOT_PROMPTS]) {
    assert.ok(names.includes(expected), `missing prompt ${expected}`);
  }
  // 1 workflow (handoff) + 91 area prompts + 4 one-shot (flight/handon/init/update) + 57 review-persona prompts
  // (rule-plan-<role> + rule-audit-<role> + rule-review-<role> for 19 active roles) = 153.
  assert.equal(names.length, EXPECTED.length + 61, "no unexpected prompts");
});

test("strict argument schema on every prompt", () => {
  for (const p of prompts) {
    assert.ok(p.description && p.description.length > 0, `${p.name}: description required`);
    assert.ok(Array.isArray(p.arguments) && p.arguments.length > 0, `${p.name}: arguments required`);
    // A prompt may have zero required arguments only when every optional
    // argument documents its default, so a bare invocation is well-defined.
    const allOptionalWithDefaults = p.arguments.every((a) => a.required === false && /default:/i.test(a.description));
    assert.ok(
      p.arguments.some((a) => a.required === true) || allOptionalWithDefaults,
      `${p.name}: at least one required argument, or every optional argument must document its default`,
    );
    for (const a of p.arguments) {
      assert.ok(a.name && a.name.length > 0, `${p.name}: argument name required`);
      assert.ok(a.description && a.description.length > 0, `${p.name}: argument ${a.name} needs a description`);
      assert.equal(typeof a.required, "boolean", `${p.name}: argument ${a.name} required must be boolean`);
    }
  }
});
