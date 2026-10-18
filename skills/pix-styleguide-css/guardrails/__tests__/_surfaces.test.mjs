

/** Every surface that carries the rule: skills, directive, reminder, compression. */
import { FLEX_FIRST, root, run, skillDocs } from "./_flex.fixture.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ── What the server generates ─────────────────────────────────────
test("no skill teaches a grid it cannot justify", () => {
  const offenders = [];
  for (const path of skillDocs()) {
    const verdict = run(readFileSync(path, "utf8"), "");
    if (!verdict.pass) {
      offenders.push(`${path.replace(root, "")}: ${verdict.detail.join(", ")}`);
    }
  }
  assert.deepEqual(offenders, [], `skills must practise the rule they state:\n${offenders.join("\n")}`);
});

test("the CSS skill states the rule where routing can find it", () => {
  const skill = readFileSync(join(root, "skills", "rule-styleguide-css", "SKILL.md"), "utf8");
  const headings = [...skill.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1]);
  const layoutHeading = headings.find((h) => /flex/i.test(h) && /grid/i.test(h));
  assert.ok(layoutHeading, "a heading has to name both, or the router cannot route to it");
  assert.match(skill, /flex-wrap/, "the flex answer for card layouts has to be shown, not just asserted");
  assert.match(skill, /grid-template-areas/, "the legitimate grid cases have to be named");
  assert.match(skill, /\/\* grid: /, "the escape-hatch marker has to be documented");
});

test("the frontend skills that list the principles list this one", () => {
  const carriers = ["rule-styleguide-css", "rule-frontend", "rule-ui-design-system"];
  for (const skill of carriers) {
    const body = readFileSync(join(root, "skills", skill, "SKILL.md"), "utf8");
    assert.match(body, /flex first|flex before grid|flex, not grid/i, `${skill} must carry the flex-first rule`);
  }
});

// ── Every surface says the same sentence ──────────────────────────

test("the clause is one sentence, kept in one place", () => {
  assert.match(FLEX_FIRST, /flex/i);
  assert.match(FLEX_FIRST, /grid/i);
  assert.ok(FLEX_FIRST.length < 200, "it rides along with every CSS result; it stays short");
});

test("compression cannot invert the rule on its way out", async () => {
  const { compressResult } = await import("@src/core/text/_compression.js");
  const compressed = compressResult({ content: [{ type: "text", text: `- ${FLEX_FIRST}` }] })
    .content.map((part) => part.text)
    .join("\n");
  // The output layer strips filler and leading articles. "only" is the word the
  // whole rule turns on: dropping it would say the opposite.
  assert.match(compressed, /grid only for/i, "the compressor must not drop the word the rule depends on");
  assert.match(compressed, /flex first/i);
});

test("the reminder carries it when CSS is on the table, and not otherwise", async () => {
  const { decorateWorkflowReminder } = await import("@src/core/enforcement/index.js");
  // The reminder is on a cadence (hardening 4.2), so the second call would carry
  // nothing at all and prove nothing about the layout rule. Re-anchor on every
  // call here: what is under test is which reminder carries FLEX_FIRST.
  process.env.RULE_MCP_REMINDER_EVERY = "1";

  try {
    const cssResult = decorateWorkflowReminder("rule_tool_styleguide_css", {
      content: [{ type: "text", text: '```css\n[data-part="row"] { display: flex; }\n```' }],
    });
    assert.match(cssResult.content.map((c) => c.text).join("\n"), new RegExp(escape(FLEX_FIRST)));

    const sqlResult = decorateWorkflowReminder("rule_tool_data_postgresql", {
      content: [{ type: "text", text: "SELECT 1;" }],
    });
    const sqlText = sqlResult.content.map((c) => c.text).join("\n");
    assert.match(sqlText, /## PIX WORKFLOW REMINDER/, "the database call did get a reminder");
    assert.doesNotMatch(sqlText, new RegExp(escape(FLEX_FIRST)), "and it says nothing about layout");
  } finally {
    delete process.env.RULE_MCP_REMINDER_EVERY;
  }
});

test("a CSS route carries it, a backend route does not", async () => {
  const { loadAllSkills } = await import("@src/core/skills/index.js");
  const { callTool } = await import("@src/tools/router/index.js");
  await loadAllSkills();

  const styling = await callTool("pix_tool", { prompt: "style a card component with CSS" });
  const routed = JSON.parse(
    styling.content
      .map((c) => c.text)
      .join("\n")
      .split("## PIX WORKFLOW REMINDER", 1)[0],
  );
  assert.equal(routed.styling_contract?.layout, FLEX_FIRST);

  const backend = await callTool("pix_tool", { prompt: "add a postgres index for a slow query" });
  const backendRoute = JSON.parse(
    backend.content
      .map((c) => c.text)
      .join("\n")
      .split("## PIX WORKFLOW REMINDER", 1)[0],
  );
  assert.equal(backendRoute.styling_contract, undefined, "a database route has no layout to contract about");
});

test("the installed agent rules carry it", () => {
  // Source guards: the block the installer writes carries the rule, and the
  // one sentence it quotes is the shared directive, not a second copy.
  const installJs = readFileSync(join(root, "src", "cli", "installers", "_instruction.data.js"), "utf8");
  const directive = readFileSync(join(root, "src", "core", "directive", "_directive.js"), "utf8");
  assert.match(installJs, /flex first/i, "the instruction block written into CLAUDE.md must carry the rule");
  assert.match(directive, /flex first/i, "the shared directive must carry the rule");
});

test("the docs carry it", () => {
  const agents = readFileSync(join(root, "docs", "03-agent-instructions.md"), "utf8");
  assert.match(agents, /flex first/i);
});

/** Escape a literal for use inside a RegExp. */
function escape(text) {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}
