/**
 * A custom skill adds rules and evidence without growing the tool surface
 * (ADR 089).
 *
 * The surface is what every turn pays for: ADR 032 measured a machine-defined
 * one at 176 tools and roughly 54k tokens of schemas. A skill this server does
 * not ship therefore mints a tool only when its frontmatter asks.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-mcp-expose-home-"));

process.env.RULE_MCP_HOME = home;
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const { clearSkillResolution, exposesTool, getSkillNames } = await import("../_skills.js");

test.after(() => rmSync(home, { recursive: true, force: true }));

/** Write a custom skill into the user layer. */
function userSkill(name, frontmatter = "") {
  const dir = join(home, "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\n${frontmatter}\n---\n\n# ${name}\n\nBody.\n`);
  clearSkillResolution();
}

test("a bundled skill keeps its tool without asking", () => {
  assert.equal(exposesTool("rule-mcp-devops-docker"), true, "the bundled catalog is the surface this server advertises");
  assert.equal(exposesTool("rule-mcp-styleguide-css"), true);
});

test("a custom skill is discoverable but mints no tool by default", () => {
  userSkill("my-house-rules");

  assert.ok(getSkillNames().includes("my-house-rules"), "it joins the set that search, check and the gateway read");
  assert.equal(exposesTool("my-house-rules"), false, "and it stays out of the tool surface");
});

test("a custom skill that asks for a tool gets one", () => {
  userSkill("my-exposed-rules", "exposeTool: true");

  assert.equal(exposesTool("my-exposed-rules"), true, "opting in is a single line in the frontmatter");
});

test("exposeTool false on a bundled skill removes its tool", () => {
  // The flag reads both ways, so a fork can shrink the surface it ships
  // without deleting the skill and the rules it owns.
  assert.equal(exposesTool("rule-mcp-process-tdd"), true);

  const dir = join(home, "skills", "rule-mcp-process-tdd");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), "---\nname: rule-mcp-process-tdd\nexposeTool: false\n---\n\n# Overridden\n");
  clearSkillResolution();

  assert.equal(exposesTool("rule-mcp-process-tdd"), false, "the layer that won decides");
});

test("a name nothing resolves to exposes nothing", () => {
  assert.equal(exposesTool("not-a-skill-at-all"), false, "an unknown name is not a tool");
});
