/**
 * Every `rule://` URI the reader answers, and the one it refuses.
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

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-resource-read-"));
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

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

test("rule://skills indexes the bundled skills with their sizes", async () => {
  const skills = await json("rule://skills");

  assert.ok(Array.isArray(skills), "the index is a list");
  assert.ok(skills.length > 0, "the bundled skills are found");

  for (const skill of skills) {
    assert.match(skill.name, /^rule/, `every entry is a rule skill: ${skill.name}`);
    assert.ok(skill.path.endsWith("SKILL.md"), `${skill.name}: the path points at its SKILL.md`);
    assert.ok(skill.length > 0, `${skill.name}: an empty skill would be a packaging bug`);
  }
});

test("rule://templates lists the template categories", async () => {
  const categories = await json("rule://templates");

  assert.ok(categories && typeof categories === "object", "the catalog is structured");
});

test("rule://ai serves the routing skill as markdown", async () => {
  const content = await body("rule://ai");

  assert.equal(content.mimeType, "text/markdown");
  assert.ok(content.text.length > 0, "the rule skill is bundled, so this is never empty");
});

test("rule://a11y points at the guide and the generators", async () => {
  const content = await body("rule://a11y");

  assert.equal(content.mimeType, "text/markdown");
  assert.match(content.text, /Playwright \+ axe-core/, "it names the tooling");
  assert.match(content.text, /rule_tool_component/, "and the tool that generates the specs");
});

test("the a11y test templates serve as plain text", async () => {
  for (const uri of ["rule://a11y/test-basic", "rule://a11y/test-forms"]) {
    const content = await body(uri);

    assert.equal(content.mimeType, "text/plain", `${uri}: a template is plain text`);
    assert.equal(typeof content.text, "string", `${uri}: a missing template serves "" rather than throwing`);
  }
});

test("rule://community reports the plugin skills, counted", async () => {
  const community = await json("rule://community");

  assert.ok(Array.isArray(community.plugins), "the plugins are a list");
  assert.equal(community.total, community.plugins.length, "the total matches the list");
  assert.deepEqual(community.known_community, [], "nothing is claimed about skills the server does not ship");
});

test("rule://project detects this repository and suggests tools for it", async () => {
  const project = await json("rule://project");

  assert.ok(project.framework, "a framework is always named");
  assert.equal(project.suggested_skills.length, 1, "one skill is suggested");
  assert.ok(project.suggested_tools.includes("rule_tool_check"), "the guardrail tool is always suggested");
  assert.match(project.message, new RegExp(project.framework), "the message names what was detected");
});

test("a skill URI serves the skill, and its summary arm truncates", async () => {
  const full = await body("rule://rule-styleguide-css");
  assert.equal(full.mimeType, "text/markdown");
  assert.ok(full.text.length > 0, "the skill body is served whole");

  const summary = await body("rule://rule-styleguide-css/summary");
  assert.match(summary.text, /^# rule-styleguide-css \(summary\)/, "the summary is labeled as one");
  assert.ok(summary.text.endsWith("...\n\n...") || summary.text.endsWith("..."), "and it says it was cut");
  assert.ok(summary.text.length < full.text.length, "a summary is shorter than the skill");
});

test("an unknown section of a known skill falls through to the whole skill", async () => {
  const section = await body("rule://rule-styleguide-css/nosuchsection");
  const full = await body("rule://rule-styleguide-css");

  assert.equal(section.text, full.text, "only `summary` is special; any other section serves the skill");
});

test("a URI nothing answers to is refused in plain text", async () => {
  for (const uri of ["rule://rule-not-a-real-skill", "rule://nonsense", "not-a-uri-at-all"]) {
    const content = await serveResource(uri);

    assert.equal(content.contents[0].mimeType, "text/plain", `${uri}: a refusal is plain text`);
    assert.equal(content.contents[0].text, "Resource not found", `${uri}: and it says so plainly`);
  }
});

test("serveResource tolerates being handed nothing", async () => {
  const content = await serveResource();

  assert.equal(content.contents[0].text, "Resource not found", "an absent URI is a miss, not a crash");
});
