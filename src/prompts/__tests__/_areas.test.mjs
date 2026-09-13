/**
 * The area prompts, derived from the resolved skill catalog.
 *
 * An area was a hand-written map with each area's tool list pasted into its
 * prose, so a skill added anywhere had to be remembered in a second place. The
 * area is already in the skill's name - `rule-frontend-react` is frontend - so
 * it is read from there, and a skill that joins a layer joins its area on its
 * own.
 *
 * The hub skill and the area are one thing: `rule-frontend` IS frontend, so it
 * owns `/rule-area-frontend` rather than competing with a prompt of the same
 * name.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { areaCommandName, areaOf, listAreaPrompts, skillAreas } from "../_areas.js";

test("an area is the segment after the rule prefix", () => {
  assert.deepEqual(areaOf("rule-frontend-react"), { area: "frontend", member: "react" });
  assert.deepEqual(areaOf("rule-frontend"), { area: "frontend", member: "" }, "the bare name is the area's hub");
  assert.deepEqual(areaOf("rule-frontend-meta-astro"), { area: "frontend", member: "meta-astro" }, "a deeper name keeps its tail whole");
  assert.equal(areaOf("rule"), null, "the router is not an area");
  assert.equal(areaOf("not-a-rule-skill"), null);
});

test("a hub skill owns its area's command, a member nests under it", () => {
  assert.equal(areaCommandName("rule-frontend"), "rule-area-frontend");
  assert.equal(areaCommandName("rule-frontend-react"), "rule-area-frontend-react");
  assert.equal(areaCommandName("rule-styleguide-a11y"), "rule-area-styleguide-a11y");
});

test("every skill lands in exactly one area", () => {
  const areas = skillAreas();
  const seen = new Set();

  for (const [area, entry] of areas) {
    assert.ok(area.length > 0, "an area has a name");

    for (const skill of [entry.hub, ...entry.members].filter(Boolean)) {
      assert.equal(seen.has(skill), false, `${skill} is claimed by two areas`);
      seen.add(skill);
    }
  }

  assert.ok(areas.size >= 10, `the catalog groups into areas: ${areas.size}`);
  assert.ok(areas.has("frontend") && areas.has("backend") && areas.has("data"), "the areas a reader expects are there");
});

test("the areas a derived map produces are the ones the catalog holds", () => {
  const areas = skillAreas();

  assert.ok(areas.get("frontend").members.includes("rule-frontend-react"), "react belongs to frontend");
  assert.ok(areas.get("frontend").members.includes("rule-frontend-meta-astro"), "so does the astro meta-framework, rather than a meta area of its own");
  assert.equal(areas.get("frontend").hub, "rule-frontend", "and frontend has a hub");
});

test("one prompt per skill, named for its area", () => {
  const prompts = listAreaPrompts();
  const names = new Set(prompts.map((prompt) => prompt.name));

  assert.ok(names.has("rule-area-frontend"), "the hub prompt");
  assert.ok(names.has("rule-area-frontend-react"), "and the member prompt");
  assert.equal(names.size, prompts.length, "no name is minted twice");

  for (const prompt of prompts) {
    assert.match(prompt.name, /^rule-area-/, `${prompt.name}: every area prompt is namespaced`);
    assert.ok(prompt.description.length > 0, `${prompt.name}: a prompt says what it is for`);
    assert.equal(prompt.arguments.length, 1, `${prompt.name}: one free-text request`);
  }
});

test("a prompt's text routes through the tool and names its skill", () => {
  const { text } = listAreaPrompts().find((prompt) => prompt.name === "rule-area-frontend-react");

  assert.match(text, /rule-frontend-react/, "it names the skill it loads as evidence");
  assert.match(text, /pix_tool/, "it routes rather than guessing");
  assert.match(text, /rule_tool_check/, "and validates what it produced");
  assert.match(text, /feat\(frontend\)/, "the commit example carries the area as its scope");
});

test("the hub prompt speaks for the whole area", () => {
  const { text } = listAreaPrompts().find((prompt) => prompt.name === "rule-area-frontend");

  assert.match(text, /frontend area/, "it says which area it is");
  assert.match(text, /rule-frontend-react/, "and lists the skills it can reach for");
});
