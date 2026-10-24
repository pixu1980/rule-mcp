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

const SKILLS = [
  "rule-mcp-ai",
  "rule-mcp-ai-prompting",
  "rule-mcp-data",
  "rule-mcp-data-sql",
  "rule-mcp-frontend",
  "rule-mcp-frontend-react",
  "rule-mcp-process",
  "rule-mcp-process-tdd",
];

test("parseSurface reads presets", () => {
  assert.deepEqual(parseSurface("minimal"), { preset: "minimal" });
  assert.deepEqual(parseSurface("standard"), { preset: "standard" });
  assert.deepEqual(parseSurface("full"), { preset: "full" });
});

test("parseSurface reads areas and skills lists", () => {
  assert.deepEqual(parseSurface("areas:frontend,data"), { areas: ["frontend", "data"] });
  assert.deepEqual(parseSurface("skills:rule-mcp-ai,rule-mcp-data-sql"), { skills: ["rule-mcp-ai", "rule-mcp-data-sql"] });
});

test("parseSurface treats empty and unknown as untouched", () => {
  assert.equal(parseSurface(), null);
  assert.equal(parseSurface(""), null);
  assert.equal(parseSurface("nope"), null, "unknown reads as full, never as empty");
  assert.equal(parseSurface("areas:"), null, "an empty list filters nothing, it does not filter everything");
});

test("areasOfSkills lists the roots, sorted", () => {
  assert.deepEqual(areasOfSkills(SKILLS), ["ai", "data", "frontend", "process"]);
  assert.ok(isRootSkill("rule-mcp-data"));
  assert.ok(!isRootSkill("rule-mcp-data-sql"));
  assert.ok(isRootSkill("rule-mcp-process"));
  assert.ok(!isRootSkill("rule-mcp-process-tdd"), "tdd is a process member, not its own area");
});

test("standard keeps the roots only", () => {
  const { skills, problems } = filterSurfaceSkills({ preset: "standard" }, SKILLS);

  assert.deepEqual(problems, []);
  assert.deepEqual([...skills].sort(), ["rule-mcp-ai", "rule-mcp-data", "rule-mcp-frontend", "rule-mcp-process"]);
});

test("areas keep their roots and members", () => {
  const { skills, problems } = filterSurfaceSkills({ areas: ["frontend"] }, SKILLS);

  assert.deepEqual(problems, []);
  assert.deepEqual([...skills].sort(), ["rule-mcp-frontend", "rule-mcp-frontend-react"]);
});

test("process area keeps tdd as a member", () => {
  const { skills, problems } = filterSurfaceSkills({ areas: ["process"] }, SKILLS);

  assert.deepEqual(problems, []);
  assert.deepEqual([...skills].sort(), ["rule-mcp-process", "rule-mcp-process-tdd"]);
});

test("skills keep their area root either way", () => {
  const { skills } = filterSurfaceSkills({ skills: ["rule-mcp-data-sql"] }, SKILLS);

  assert.deepEqual([...skills].sort(), ["rule-mcp-data", "rule-mcp-data-sql"], "a hub keeps its area reachable");
});

test("unknown names warn and keep the known", () => {
  const { skills, problems } = filterSurfaceSkills({ areas: ["frontend", "nope"] }, SKILLS);

  assert.equal(problems.length, 1);
  assert.match(problems[0], /unknown area "nope"/);
  assert.ok(skills.has("rule-mcp-frontend"));
});
