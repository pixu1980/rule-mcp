

/** The surfaces: the skill exists and is routed, its wordlist matches the gate, prompts carry the mandate. */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { findFingerprints } from "./_english.fixture.mjs";

test("the rule-mcp-process-ai skill exists and is routed", async () => {
  const skillDir = "skills/rule-mcp-process-ai";
  assert.ok(existsSync(join(skillDir, "SKILL.md")), `${skillDir}/SKILL.md exists`);

  const { parseSkillFrontmatter } = await import("../../skills/index.js");
  const meta = parseSkillFrontmatter(readFileSync(join(skillDir, "SKILL.md"), "utf8"));
  assert.equal(meta.name, "rule-mcp-process-ai", "frontmatter name matches the directory");
  assert.match(meta.description, /english/i, "the description advertises English/American spelling");

  const { callTool } = await import("../../../tools/router/index.js");
  const answer = JSON.parse((await callTool("rule_tool", { prompt: "americanize this comment: colour -> color, behaviour -> behavior" })).content[0].text);
  assert.match(`${answer.route} ${(answer.alternatives ?? []).map((a) => a.route).join(" ")}`, /process-ai/, "an americanize/english-spelling prompt routes to the merged skill");
});

test("the skill's wordlist matches the fingerprint dictionary exactly (no drift)", () => {
  // The spelling table lives in the reference the merged skill owns.
  const skillText = readFileSync("skills/rule-mcp-process-ai/references/english.md", "utf8");
  const pairs = [...skillText.matchAll(/^- ([a-z]+) → ([a-z]+)$/gim)].map((m) => [m[1].toLowerCase(), m[2].toLowerCase()]);
  assert.ok(pairs.length >= 4, "the skill advertises the key UK→US pairs");

  for (const [uk, us] of pairs) {
    const { british } = findFingerprints(`the word ${uk} here`);
    assert.ok(british.includes(uk), `fingerprint dictionary must flag "${uk}" so the skill's "${uk} -> ${us}" stays honest`);
    assert.ok(!british.includes(us), `the US form "${us}" must not be flagged`);
  }
});

test("every shared prompt/command surface carries the English mandate", async () => {
  const { commandDefinition } = await import("../../agents/commands/index.js");
  const surfaces = [
    ["router command", commandDefinition("rule-mcp").body],
    ["handoff command", commandDefinition("rule-mcp-handoff").body],
  ];
  for (const [label, body] of surfaces) {
    assert.match(body, /American spelling|American English|US spelling/i, `${label} must carry the mandate`);
  }

  const { fillRoleTemplate } = await import("../../review/template/index.js");
  const { roleById } = await import("../../review/roles/index.js");
  const filled = fillRoleTemplate(roleById("security"));
  assert.match(filled, /American spelling|English/i, "the persona template carries the mandate");
});
