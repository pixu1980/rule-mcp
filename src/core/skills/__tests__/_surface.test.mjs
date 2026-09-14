/**
 * The server surface selection: which skill tools a filtered server keeps.
 *
 * Pure by construction: every function takes the skill universe as an
 * argument, so no test boots the router. The loader passes the live catalog;
 * the wizard passes it for counts.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { areasOfSkills, filterSurfaceSkills, isRootSkill, parseSurface } from "../_surface.js";

const SKILLS = ["pix-ai", "pix-ai-prompting", "pix-data", "pix-data-sql", "pix-frontend", "pix-frontend-react", "pix-caveman"];

test("parseSurface reads presets", () => {
  assert.deepEqual(parseSurface("minimal"), { preset: "minimal" });
  assert.deepEqual(parseSurface("standard"), { preset: "standard" });
  assert.deepEqual(parseSurface("full"), { preset: "full" });
});

test("parseSurface reads areas and skills lists", () => {
  assert.deepEqual(parseSurface("areas:frontend,data"), { areas: ["frontend", "data"] });
  assert.deepEqual(parseSurface("skills:pix-ai,pix-data-sql"), { skills: ["pix-ai", "pix-data-sql"] });
});

test("parseSurface treats empty and unknown as untouched", () => {
  assert.equal(parseSurface(), null);
  assert.equal(parseSurface(""), null);
  assert.equal(parseSurface("nope"), null, "unknown reads as full, never as empty");
  assert.equal(parseSurface("areas:"), null, "an empty list filters nothing, it does not filter everything");
});

test("areasOfSkills lists the eleven roots, sorted", () => {
  assert.deepEqual(areasOfSkills(SKILLS), ["ai", "caveman", "data", "frontend"]);
  assert.ok(isRootSkill("pix-data"));
  assert.ok(!isRootSkill("pix-data-sql"));
});

test("standard keeps the roots only", () => {
  const { skills, problems } = filterSurfaceSkills({ preset: "standard" }, SKILLS);

  assert.deepEqual(problems, []);
  assert.deepEqual([...skills].sort(), ["pix-ai", "pix-caveman", "pix-data", "pix-frontend"]);
});

test("areas keep their roots and members", () => {
  const { skills, problems } = filterSurfaceSkills({ areas: ["frontend"] }, SKILLS);

  assert.deepEqual(problems, []);
  assert.deepEqual([...skills].sort(), ["pix-frontend", "pix-frontend-react"]);
});

test("skills keep their area root either way", () => {
  const { skills } = filterSurfaceSkills({ skills: ["pix-data-sql"] }, SKILLS);

  assert.deepEqual([...skills].sort(), ["pix-data", "pix-data-sql"], "a hub keeps its area reachable");
});

test("unknown names warn and keep the known", () => {
  const { skills, problems } = filterSurfaceSkills({ areas: ["frontend", "nope"] }, SKILLS);

  assert.equal(problems.length, 1);
  assert.match(problems[0], /unknown area "nope"/);
  assert.ok(skills.has("pix-frontend"));
});
