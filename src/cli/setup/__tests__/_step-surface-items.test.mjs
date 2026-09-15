

/**
 * The rows the surface step offers, and the line the review screen shows for
 * the answer.
 *
 * The surface question is the one that decides what every later turn costs, so
 * each row has to carry its own price and the review line has to say which
 * answer was given - a screen that reported "custom" for three different
 * selections would be a screen nobody could check.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const { loadAllSkills } = await import("../../../core/skills/index.js");
await loadAllSkills();

const { surfaceAreaItems, surfaceLabel, surfacePresetItems, surfaceSkillItems } = await import("../_step-surface.js");

test("the presets are the three shapes plus the way out, each with its count", () => {
  const items = surfacePresetItems();

  assert.deepEqual(
    items.map((item) => item.id),
    ["full", "standard", "minimal", "custom"],
  );

  for (const item of items.slice(0, 3)) {
    assert.match(item.label, /\(\d+ [a-z ]*tools?[^)]*\)/, `${item.id} names its price: ${item.label}`);
  }

  assert.equal(items.at(-1).label, "Custom", "the escape hatch has no count to give");
});

test("every area row counts the skills it would keep", () => {
  const items = surfaceAreaItems();

  assert.ok(items.length > 0, "the catalog covers areas");

  for (const item of items) {
    assert.match(item.label, /^\S+ \(\d+ skills\)$/, item.label);
    assert.match(item.detail[0], /hub and its -?\d+ member skills\./);
  }
});

test("the skills of an area are offered, hub included, and named by kind", () => {
  const [first] = surfaceAreaItems();
  const items = surfaceSkillItems([first.id]);

  assert.ok(items.length > 0, `${first.id} has skills to offer`);

  const hub = items.find((item) => item.id === `rule-${first.id}`);

  if (hub) {
    assert.deepEqual(hub.detail, ["Area hub: kept either way."], "a hub says it is kept whatever the tick");
  }

  for (const item of items.filter((entry) => entry.id !== `rule-${first.id}`)) {
    assert.deepEqual(item.detail, ["Member skill tool."]);
  }
});

test("an area nobody has offers no skills", () => {
  assert.deepEqual(surfaceSkillItems(["not-an-area"]), []);
  assert.deepEqual(surfaceSkillItems([]), [], "and neither does asking for none");
});

test("the review line says which answer was given", () => {
  assert.equal(surfaceLabel(null), "full surface", "no answer is the full surface");
  assert.equal(surfaceLabel(undefined), "full surface");
  assert.equal(surfaceLabel({ preset: "minimal" }), "surface minimal");
  assert.equal(surfaceLabel({ areas: ["frontend", "backend"] }), "surface areas frontend,backend");
  assert.equal(surfaceLabel({ skills: ["a", "b", "c"] }), "surface 3 skills", "skills are counted, because naming them would not fit one line");
});
