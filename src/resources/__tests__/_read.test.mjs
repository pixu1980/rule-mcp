/**
 * Every `rule://` URI the server advertises, read back.
 *
 * `listResources()` promises a URI list; nothing checked that reading one
 * returns what its entry claims. Eleven of the reader's twenty-six branches
 * were unvisited, which is one branch per URI shape - the catalogs, the two
 * a11y templates, the project probe, a skill and its summary, and the
 * not-found fallback that must answer rather than throw.
 */
import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-read-"));
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_CACHE = "1";

const { serveResource } = await import("../_read.js");
const { listResources } = await import("../index.js");
const { loadAllSkills } = await import("../../core/skills/index.js");

await loadAllSkills();

/** The single content item a read returns. */
const one = async (uri) => (await serveResource(uri)).contents[0];
const json = async (uri) => JSON.parse((await one(uri)).text);

test("the skill index lists every bundled skill with its path and size", async () => {
  const item = await one("rule://skills");

  assert.equal(item.mimeType, "application/json");
  const skills = JSON.parse(item.text);
  assert.ok(skills.length > 50, `the catalog, not a sample: got ${skills.length}`);

  for (const entry of skills.slice(0, 5)) {
    assert.match(entry.name, /^rule/);
    assert.match(entry.path, /SKILL\.md$/);
    assert.ok(entry.length > 0, `${entry.name} has a body`);
  }
});

test("the template catalog answers with its categories", async () => {
  const item = await one("rule://templates");

  assert.equal(item.mimeType, "application/json");
  assert.ok(Array.isArray(JSON.parse(item.text)) || typeof JSON.parse(item.text) === "object");
});

test("the community index reports plugin skills, and reports none honestly", async () => {
  const result = await json("rule://community");

  assert.equal(typeof result.total, "number");
  assert.deepEqual(result.known_community, []);
  assert.equal(result.plugins.length, result.total, "the count is the list, not a claim about it");

  for (const plugin of result.plugins) {
    assert.equal(plugin.type, "plugin");
    assert.ok(plugin.description.length > 0, `${plugin.name} carries a description`);
  }
});

test("the project probe detects the framework and suggests tools for it", async () => {
  const result = await json("rule://project");

  assert.ok(result.framework, "a framework is reported, even if vanilla");
  assert.equal(result.suggested_skills.length, 1);
  assert.ok(result.suggested_tools.includes("rule_tool_check"), "the guardrail tool is always suggested");
  assert.match(result.message, /Detected/);
});

test("rule://ai serves the dispatcher skill body", async () => {
  const item = await one("rule://ai");

  assert.equal(item.mimeType, "text/markdown");
  assert.match(item.text, /^---\nname: rule\n/, "the hub skill, frontmatter and all");
});

test("the a11y guide and both test templates read back", async () => {
  const guide = await one("rule://a11y");
  assert.equal(guide.mimeType, "text/markdown");
  assert.match(guide.text, /rule_tool_component/, "it points at the tool that generates the files");

  for (const uri of ["rule://a11y/test-basic", "rule://a11y/test-forms"]) {
    const item = await one(uri);
    assert.equal(item.mimeType, "text/plain", `${uri} is a file, not prose`);
    assert.ok(item.text.length > 0, `${uri} has content`);
  }
});

test("a skill URI serves its body, and /summary serves the head of it", async () => {
  const full = await one("rule://rule-backend-node");
  assert.equal(full.mimeType, "text/markdown");
  assert.match(full.text, /name: rule-backend-node/);

  const summary = await one("rule://rule-backend-node/summary");
  assert.match(summary.text, /^# rule-backend-node \(summary\)/);
  assert.ok(summary.text.length < full.text.length, "a summary is shorter than the body");
  assert.match(summary.text, /\.\.\.$/, "and says it was cut");
});

test("an unknown URI answers instead of throwing", async () => {
  for (const uri of ["rule://not-a-skill", "rule://", "totally-invalid", undefined]) {
    const item = await one(uri);
    assert.equal(item.text, "Resource not found", `${uri} must answer`);
    assert.equal(item.mimeType, "text/plain");
  }
});

test("every advertised resource URI is readable", async () => {
  const advertised = listResources();
  assert.ok(advertised.length > 100, `the surface, not a sample: got ${advertised.length}`);

  // The whole list is the point: an advertised URI that reads back "not found"
  // is a promise the server does not keep.
  const missing = [];

  for (const resource of advertised) {
    const item = await one(resource.uri);

    if (item.text === "Resource not found") {
      missing.push(resource.uri);
    }
  }

  assert.deepEqual(missing, []);
});
