/**
 * The area prompts, derived from the resolved skill catalog.
 *
 * Hub collectors only on the slash/MCP prompt surface (ADR 117); leaf skills
 * stay as tools and are named from free text on the hub.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { areaCommandName, areaOf, listAreaPrompts, skillAreas, skillToolName } from "../_areas.js";

test("an area is the segment after the rule-mcp prefix", () => {
  assert.deepEqual(areaOf("rule-frontend-react"), { area: "frontend", member: "react" });
  assert.deepEqual(areaOf("rule-frontend"), { area: "frontend", member: "" }, "the bare name is the area's hub");
  assert.deepEqual(areaOf("rule-frontend-meta-astro"), { area: "frontend", member: "meta-astro" }, "a deeper name keeps its tail whole");
  assert.equal(areaOf("rule"), null, "the router is not an area");
  assert.equal(areaOf("not-a-rule-skill"), null);
});

test("every skill routes through its area hub command (ADR 117)", () => {
  assert.equal(areaCommandName("rule-frontend"), "rule-area-frontend");
  assert.equal(areaCommandName("rule-frontend-react"), "rule-area-frontend");
  assert.equal(areaCommandName("rule-styleguide-a11y"), "rule-area-styleguide");
  assert.equal(skillToolName("rule-frontend-react"), "rule_tool_frontend_react");
});

test("every skill lands in exactly one area", () => {
  const areas = skillAreas();
  const seen = new Set();

  for (const [area, entry] of areas) {
    assert.ok(area.length > 0, "an area has a name");

    const owned = [entry.hub, ...entry.members].filter(Boolean);

    for (const skill of owned) {
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
  assert.equal(areas.get("frontend").hub, "rule-frontend", "and frontend has a hub");
  assert.ok(areas.get("meta").members.includes("rule-meta-astro"), "astro belongs to the meta area");
  assert.equal(areas.get("meta").hub, "rule-meta", "and meta has a hub of its own");
});

test("one prompt per area hub only (ADR 117)", () => {
  const prompts = listAreaPrompts();
  const names = new Set(prompts.map((prompt) => prompt.name));

  assert.ok(names.has("rule-area-frontend"), "the hub prompt");
  assert.ok(!names.has("rule-area-frontend-react"), "no member slash/prompt");
  assert.equal(names.size, prompts.length, "no name is minted twice");
  assert.equal(
    prompts.every((p) => /^rule-area-[a-z]+$/.test(p.name)),
    true,
    "every area prompt is a single-segment hub",
  );

  for (const prompt of prompts) {
    assert.ok(prompt.description.length > 0, `${prompt.name}: a prompt says what it is for`);
    assert.equal(prompt.arguments.length, 1, `${prompt.name}: one free-text request`);
    assert.ok(Array.isArray(prompt.members), `${prompt.name}: members listed for routing`);
  }
});

test("the hub prompt routes leaves from free text and names tools", () => {
  const { text, members } = listAreaPrompts().find((prompt) => prompt.name === "rule-area-frontend");

  assert.match(text, /frontend area/, "it says which area it is");
  assert.match(text, /rule-frontend-react/, "and lists the skills it can reach for");
  assert.match(text, /rule_tool_frontend_react/, "and the matching leaf tools");
  assert.match(text, /rule_tool/, "it routes rather than guessing");
  assert.match(text, /rule_tool_check/, "and validates what it produced");
  assert.match(text, /feat\(frontend\)/, "the commit example carries the area as its scope");
  assert.ok(members.includes("rule-frontend-react"));
});
