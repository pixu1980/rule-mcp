// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/**
 * Every `pix://` URI the reader answers, and the one it refuses.
 *
 * The reader is one long chain of URI equality checks: each arm is its own
 * mime type and its own body shape, and nothing but a test says which arm a
 * URI lands in.
 */
import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.PIX_GALAXY_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "pix-resource-read-"));
process.env.PIX_GALAXY_MCP_NO_AUTOUPDATE = "1";

const { serveResource } = await import("../_read.js");
const { loadAllSkills } = await import("../../core/skills/index.js");

await loadAllSkills();

/** The single content entry a URI serves. */
async function body(uri) {
  const result = await serveResource(uri);

  assert.equal(result.contents.length, 1, `${uri}: a resource serves exactly one body`);
  assert.equal(result.contents[0].uri, uri, `${uri}: the body echoes the URI it answers`);

  return result.contents[0];
}

/** The parsed JSON body of a URI that serves application/json. */
async function json(uri) {
  const content = await body(uri);

  assert.equal(content.mimeType, "application/json", `${uri}: serves JSON`);

  return JSON.parse(content.text);
}

test("pix://skills indexes the bundled skills with their sizes", async () => {
  const skills = await json("pix://skills");

  assert.ok(Array.isArray(skills), "the index is a list");
  assert.ok(skills.length > 0, "the bundled skills are found");

  for (const skill of skills) {
    assert.match(skill.name, /^pix/, `every entry is a pix skill: ${skill.name}`);
    assert.ok(skill.path.endsWith("SKILL.md"), `${skill.name}: the path points at its SKILL.md`);
    assert.ok(skill.length > 0, `${skill.name}: an empty skill would be a packaging bug`);
  }
});

test("pix://templates lists the template categories", async () => {
  const categories = await json("pix://templates");

  assert.ok(categories && typeof categories === "object", "the catalog is structured");
});

test("pix://ai serves the routing skill as markdown", async () => {
  const content = await body("pix://ai");

  assert.equal(content.mimeType, "text/markdown");
  assert.ok(content.text.length > 0, "the pix skill is bundled, so this is never empty");
});

test("pix://a11y points at the guide and styleguide/persona surfaces", async () => {
  const content = await body("pix://a11y");

  assert.equal(content.mimeType, "text/markdown");
  assert.match(content.text, /Playwright \+ axe-core/, "it names the tooling");
  assert.match(content.text, /pix-styleguide-a11y|pix-persona-a11y|pix-area-styleguide/, "and the a11y surface (ADR 115)");
});

test("the a11y test templates serve as plain text", async () => {
  for (const uri of ["pix://a11y/test-basic", "pix://a11y/test-forms"]) {
    const content = await body(uri);

    assert.equal(content.mimeType, "text/plain", `${uri}: a template is plain text`);
    assert.equal(typeof content.text, "string", `${uri}: a missing template serves "" rather than throwing`);
  }
});

test("pix://community reports the plugin skills, counted", async () => {
  const community = await json("pix://community");

  assert.ok(Array.isArray(community.plugins), "the plugins are a list");
  assert.equal(community.total, community.plugins.length, "the total matches the list");
  assert.deepEqual(community.known_community, [], "nothing is claimed about skills the server does not ship");
});

test("pix://project detects this repository and suggests tools for it", async () => {
  const project = await json("pix://project");

  assert.ok(project.framework, "a framework is always named");
  assert.equal(project.suggested_skills.length, 1, "one skill is suggested");
  assert.ok(project.suggested_tools.includes("pix_tool_check"), "the guardrail tool is always suggested");
  assert.match(project.message, new RegExp(project.framework), "the message names what was detected");
});

test("a skill URI serves the skill, and its summary arm truncates", async () => {
  const full = await body("pix://pix-styleguide-css");
  assert.equal(full.mimeType, "text/markdown");
  assert.ok(full.text.length > 0, "the skill body is served whole");

  const summary = await body("pix://pix-styleguide-css/summary");
  assert.match(summary.text, /^# pix-styleguide-css \(summary\)/, "the summary is labeled as one");
  assert.ok(summary.text.endsWith("...\n\n...") || summary.text.endsWith("..."), "and it says it was cut");
  assert.ok(summary.text.length < full.text.length, "a summary is shorter than the skill");
});

test("an unknown section of a known skill falls through to the whole skill", async () => {
  const section = await body("pix://pix-styleguide-css/nosuchsection");
  const full = await body("pix://pix-styleguide-css");

  assert.equal(section.text, full.text, "only `summary` is special; any other section serves the skill");
});

test("a URI nothing answers to is refused in plain text", async () => {
  for (const uri of ["pix://pix-not-a-real-skill", "pix://nonsense", "not-a-uri-at-all"]) {
    const content = await serveResource(uri);

    assert.equal(content.contents[0].mimeType, "text/plain", `${uri}: a refusal is plain text`);
    assert.equal(content.contents[0].text, "Resource not found", `${uri}: and it says so plainly`);
  }
});

test("serveResource tolerates being handed nothing", async () => {
  const content = await serveResource();

  assert.equal(content.contents[0].text, "Resource not found", "an absent URI is a miss, not a crash");
});
