

/**
 * The surface step: the rows it shows, and where answering it goes.
 *
 * The rail, the hints and the views are three lists that must agree on the
 * step order; this pins the Surface entry in all three, the way
 * `_commands-step.test.mjs` pins the Commands one.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { surfaceAreaItems, surfacePresetItems, surfaceSkillItems } from "../_step-surface.js";
import { HINTS, STEP_NAMES } from "../_steps.data.js";

test("the surface step offers presets first, with what each one keeps", () => {
  const ids = surfacePresetItems().map((item) => item.id);

  assert.deepEqual(ids, ["full", "standard", "minimal", "custom"]);
});

test("the custom drill-down covers every area the catalog has", () => {
  const areas = surfaceAreaItems().map((item) => item.id);

  assert.ok(areas.includes("frontend") && areas.includes("ai"), areas.join(","));

  const skillIds = new Set(surfaceSkillItems(["frontend"]).map((item) => item.id));

  assert.ok(skillIds.has("rule-frontend"), "the hub is listed");
  assert.ok(skillIds.has("rule-frontend-react"), "members are listed");
});

test("the rail, hints and views agree on nine install steps", () => {
  assert.deepEqual(STEP_NAMES.install, ["Preflight", "Agents", "Mode", "Extras", "Commands", "Surface", "Review", "Install", "Done"]);
  assert.equal(HINTS.install.length, STEP_NAMES.install.length, "every rail step needs its hint row");
});
