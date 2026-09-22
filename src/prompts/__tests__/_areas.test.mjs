// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/**
 * The area prompts, derived from the resolved skill catalog.
 *
 * Hub collectors only on the slash/MCP prompt surface (ADR 117); leaf skills
 * stay as tools and are named from free text on the hub.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { areaCommandName, areaOf, listAreaPrompts, skillAreas, skillToolName } from "../_areas.js";

test("an area is the segment after the pix prefix", () => {
  assert.deepEqual(areaOf("pix-frontend-react"), { area: "frontend", member: "react" });
  assert.deepEqual(areaOf("pix-frontend"), { area: "frontend", member: "" }, "the bare name is the area's hub");
  assert.deepEqual(areaOf("pix-frontend-meta-astro"), { area: "frontend", member: "meta-astro" }, "a deeper name keeps its tail whole");
  assert.equal(areaOf("pix"), null, "the router is not an area");
  assert.equal(areaOf("not-a-pix-skill"), null);
});

test("every skill routes through its area hub command (ADR 117)", () => {
  assert.equal(areaCommandName("pix-frontend"), "pix-area-frontend");
  assert.equal(areaCommandName("pix-frontend-react"), "pix-area-frontend");
  assert.equal(areaCommandName("pix-styleguide-a11y"), "pix-area-styleguide");
  assert.equal(skillToolName("pix-frontend-react"), "pix_tool_frontend_react");
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

  assert.ok(areas.get("frontend").members.includes("pix-frontend-react"), "react belongs to frontend");
  assert.equal(areas.get("frontend").hub, "pix-frontend", "and frontend has a hub");
  assert.ok(areas.get("meta").members.includes("pix-meta-astro"), "astro belongs to the meta area");
  assert.equal(areas.get("meta").hub, "pix-meta", "and meta has a hub of its own");
});

test("one prompt per area hub only (ADR 117)", () => {
  const prompts = listAreaPrompts();
  const names = new Set(prompts.map((prompt) => prompt.name));

  assert.ok(names.has("pix-area-frontend"), "the hub prompt");
  assert.ok(!names.has("pix-area-frontend-react"), "no member slash/prompt");
  assert.equal(names.size, prompts.length, "no name is minted twice");
  assert.equal(
    prompts.every((p) => /^pix-area-[a-z]+$/.test(p.name)),
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
  const { text, members } = listAreaPrompts().find((prompt) => prompt.name === "pix-area-frontend");

  assert.match(text, /frontend area/, "it says which area it is");
  assert.match(text, /pix-frontend-react/, "and lists the skills it can reach for");
  assert.match(text, /pix_tool_frontend_react/, "and the matching leaf tools");
  assert.match(text, /pix_tool/, "it routes rather than guessing");
  assert.match(text, /pix_tool_check/, "and validates what it produced");
  assert.match(text, /feat\(frontend\)/, "the commit example carries the area as its scope");
  assert.ok(members.includes("pix-frontend-react"));
});
