

/**
 * PERF-9: the meta-framework dispatcher.
 *
 * The four meta skills were named `rule-mcp-frontend-meta-*` and routed through the
 * router's frontend area, where they compete with eleven component skills. The
 * rename plus this narrow hub is what the user asked for; the test pins that
 * the hub routes on a named framework, routes on a concept when none is named,
 * and refuses rather than guessing when neither is present.
 */
import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-mcp-meta-tool-"));
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_CACHE = "1";

const { loadAllSkills } = await import("../../../core/skills/index.js");
await loadAllSkills(true);
const { callTool, getSkillNames, listTools } = await import("../../router/index.js");
const { META_CONCEPTS, META_HUB } = await import("../_concepts.data.js");

const route = async (prompt, framework) => JSON.parse((await callTool("rule_tool_meta", { prompt, ...(framework && { framework }) })).content[0].text);

test("a named framework routes there and says what to load with it", async () => {
  for (const framework of Object.keys(META_CONCEPTS)) {
    const answer = await route(`build a page with ${framework}`);

    assert.equal(answer.route, `rule-mcp-meta-${framework}`, `${framework} must route to its own skill`);
    assert.deepEqual(answer.with_skills, META_HUB[framework], "the component layer travels with the meta skill");
    assert.ok(answer.next_tools.includes(`rule_tool_meta_${framework}`), "and the per-skill tool is offered");
  }
});

test("a concept routes without the framework being named", async () => {
  for (const [framework, concepts] of Object.entries(META_CONCEPTS)) {
    const answer = await route(`how do I use ${concepts[0]} here`);

    assert.equal(answer.route, `rule-mcp-meta-${framework}`, `"${concepts[0]}" belongs to ${framework}`);
  }
});

test("the framework hint wins over an unrelated prompt", async () => {
  const answer = await route("render this page on the server", "nuxt");

  assert.equal(answer.route, "rule-mcp-meta-nuxt");
});

test("no match refuses instead of guessing, and points at the wider router", async () => {
  const answer = await route("how do I center a div");

  assert.equal(answer.route, "unknown");
  assert.equal(answer.uncertain, true);
  assert.ok(answer.next_tools.includes("rule_tool"), "the whole-set router is the next step");
  assert.deepEqual(answer.sections, []);
});

test("an empty prompt asks for one rather than routing", async () => {
  const answer = await route("");

  assert.equal(answer.route, "none");
  assert.equal(answer.confidence, 0);
  assert.ok(answer.skills_available.length >= 4);
});

test("the hub is a dispatcher, not a skill tool", () => {
  const names = new Set(listTools().map((tool) => tool.name));

  assert.ok(names.has("rule_tool_meta"), "the dispatcher is registered");
  assert.equal(names.has("rule_tool_meta_hub"), false);

  for (const framework of Object.keys(META_CONCEPTS)) {
    assert.ok(names.has(`rule_tool_meta_${framework}`), `rule_tool_meta_${framework} is registered`);
    assert.equal(names.has(`rule_tool_frontend_meta_${framework}`), false, "the old name is gone");
  }

  assert.ok(getSkillNames().includes("rule-mcp-meta"), "the hub skill ships");
});
