/**
 * @module test/css-flex-first.test
 *
 * Flex is the default layout tool; grid is the exception that has to earn it.
 *
 * The rule: if the same visual result is reachable with flex, flex is what gets
 * written. `display: grid` is for the four things flex genuinely cannot do -
 * named template areas, subgrid, explicit item placement or overlap, and
 * auto-fit/auto-fill tracks - plus the case a human states in a comment.
 *
 * A rule that lives in one skill is a suggestion. These tests hold it in every
 * place it has to be true at once: the blocking guardrail, the generated
 * component templates, every fenced CSS block in the whole skill corpus, the
 * per-call reminder, the route payload, the installed agent rules and the docs.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const root = fileURLToPath(new URL("../..", import.meta.url));

const { SHARED_GUARDRAILS } = await import("../../src/core/guardrail-defs.js");
const { getGuardrails, checkCode } = await import("../../src/core/guardrails.js");
const { FLEX_FIRST } = await import("../../src/core/directive.js");

const GUARDRAIL_ID = "css-flex-first";

/** Run only the flex-first guardrail over a CSS body. */
function run(css, fileName = "_Component.css") {
  const guardrail = SHARED_GUARDRAILS.find((g) => g.id === GUARDRAIL_ID);

  return guardrail.check(css, fileName ? { fileName } : {});
}

// ── The guardrail ─────────────────────────────────────────────────

test("the guardrail is shared, so it reaches every skill", () => {
  assert.ok(
    SHARED_GUARDRAILS.some((g) => g.id === GUARDRAIL_ID),
    "css-flex-first must be a shared guardrail",
  );
  for (const skill of ["rule-styleguide-css", "rule-frontend-react", "rule-ui-design-system"]) {
    const ids = new Set(getGuardrails(skill).map((g) => g.id));
    assert.ok(ids.has(GUARDRAIL_ID), `${skill} must carry ${GUARDRAIL_ID}`);
  }

  // Through the entry point rule_tool_check uses, not only the check function.
  const report = checkCode("rule-styleguide-css", '[data-part="row"] { display: grid; }', {
    fileName: "_Row.css",
  });
  const entry = report.failed.find((r) => r.id === GUARDRAIL_ID);
  assert.ok(entry, "checkCode has to report an unjustified grid among its failures");
  assert.equal(report.allPass, false);
});

test("a grid that a flex row would have done fails", () => {
  const result = run(`[data-part="row"] {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.8rem;
}`);
  assert.equal(result.pass, false);
  assert.equal(result.failCount, 1);
  assert.match(result.detail.join(" "), /row/);
  assert.match(result.suggestion, /flex/i);
});

test("inline-grid with nothing to justify it fails too", () => {
  assert.equal(run(`[data-part="chip"] { display: inline-grid; }`).pass, false);
});

test("a grid inside a media query is not a hiding place", () => {
  const result = run(`@media (min-width: 40rem) {
  [data-part="row"] {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}`);
  assert.equal(result.pass, false);
});

test("every grid a flex container cannot replace passes", () => {
  const necessary = {
    "named areas": `[data-part="page"] {
  display: grid;
  grid-template-areas: "nav main" "nav footer";
}`,
    subgrid: `[data-part="row"] {
  display: grid;
  grid-template-columns: subgrid;
}`,
    "auto-fit tracks": `[data-part="cards"] {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
}`,
    "auto-fill tracks": `[data-part="cards"] {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
}`,
    "dense flow": `[data-part="mosaic"] {
  display: grid;
  grid-auto-flow: dense;
}`,
    "explicit placement in a child": `[data-part="board"] {
  display: grid;
}
[data-part="cell"][data-wide] {
  grid-column: 1 / span 2;
}`,
    "overlapping cells": `[data-part="hero"] {
  display: grid;
}
[data-part="hero-caption"] {
  grid-area: 1 / 1;
}`,
  };
  for (const [why, css] of Object.entries(necessary)) {
    assert.equal(run(css).pass, true, `${why} is a legitimate grid and must pass`);
  }
});

test("a stated reason passes, and it has to say grid", () => {
  const stated = `/* grid: the tracks must line up across rows */
[data-part="ledger"] {
  display: grid;
}`;
  assert.equal(run(stated).pass, true, "an explicit reason is the escape hatch");

  const vague = `/* layout */
[data-part="ledger"] {
  display: grid;
}`;
  assert.equal(run(vague).pass, false, "a comment that explains nothing is not a reason");
});

test("flex needs no permission, and code without CSS is not checked", () => {
  assert.equal(
    run(`[data-part="row"] {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}
[data-part="cards"] {
  display: flex;
  flex-wrap: wrap;
}
[data-part="card"] {
  flex: 1 1 17rem;
}`).pass,
    true,
  );

  const noCss = run("export function add(a, b) {\n  return a + b;\n}", "math.js");
  assert.equal(noCss.pass, true);
  assert.match(noCss.note ?? "", /skip/i);
});

test("each unjustified grid is counted, not just the first", () => {
  const result = run(`[data-part="a"] {
  display: grid;
}
[data-part="b"] {
  display: grid;
  grid-template-columns: 1fr auto;
}
[data-part="c"] {
  display: grid;
  grid-template-areas: "x y";
}`);
  assert.equal(result.pass, false);
  assert.equal(result.failCount, 2, "the named-areas rule is legitimate and must not be counted");
});

test("raw CSS with no file name is still CSS", () => {
  // The natural hand-call shape: a stylesheet pasted straight into
  // rule_tool_check with no fileName and no fence. CSS guardrails look for a
  // "CSS block", so an unfenced, unnamed stylesheet used to be invisible to all
  // of them - which is a rule that passes by not being asked.
  const bare = `[data-part="row"] {
  display: grid;
  grid-template-columns: 1fr auto;
}`;
  const report = checkCode("rule-styleguide-css", bare, {});
  assert.ok(
    report.failed.some((r) => r.id === GUARDRAIL_ID),
    "an unnamed, unfenced stylesheet has to be checked like any other",
  );

  // The same input through the tool the model actually calls.
  assert.equal(run(bare, "").pass, false);

  // And the sibling CSS rules see it too, not just this one.
  const classy = checkCode("rule-styleguide-css", ".card {\n  color: red;\n}", {});
  assert.ok(
    classy.failed.some((r) => r.id === "no-css-classes"),
    "a class selector in a bare stylesheet has to fail as well",
  );

  // Reading a bare stylesheet must not invent other failures: it is external
  // CSS by definition, the same as a named .css file.
  const clean = checkCode("rule-styleguide-css", '[data-part="row"] {\n  display: flex;\n}', {});
  assert.deepEqual(
    clean.failed.map((r) => r.id),
    [],
    "a clean bare stylesheet has to pass everything",
  );

  // JavaScript is not a stylesheet, whatever its object literals look like.
  const js = checkCode("rule-styleguide-javascript", "export const style = { display: 'grid' };\n", {});
  assert.equal(
    js.failed.some((r) => r.id === GUARDRAIL_ID),
    false,
    "a JS object literal is not a grid container",
  );
});

// ── What the server generates ─────────────────────────────────────

test("generated components pass their own rule", async () => {
  const { loadAllSkills } = await import("../../src/core/skills.js");
  const { callTool } = await import("../../src/tools/router/index.js");
  await loadAllSkills();

  for (const component of ["button", "card", "modal", "list", "nav", "form", "table"]) {
    for (const framework of ["vanilla", "react", "vue", "svelte"]) {
      const result = await callTool("rule_tool_component", { component, framework });
      const text = result.content.map((c) => c.text).join("\n");
      const verdict = run(text, "");
      assert.equal(verdict.pass, true, `${component}/${framework} generates an unjustified grid: ${verdict.detail}`);
    }
  }
});

// ── What the skills teach ─────────────────────────────────────────

/** Every markdown file under skills/, recursively. */
function skillDocs(dir = join(root, "skills"), found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      skillDocs(path, found);
    } else if (entry.name.endsWith(".md")) {
      found.push(path);
    }
  }

  return found;
}

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
  const carriers = ["rule-styleguide-css", "rule-frontend", "rule-ui-design-system", "rule-styleguide-patterns"];
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
  const { compressResult } = await import("../../src/core/text/_caveman.js");
  const compressed = compressResult({ content: [{ type: "text", text: `- ${FLEX_FIRST}` }] })
    .content.map((part) => part.text)
    .join("\n");
  // The output layer strips filler and leading articles. "only" is the word the
  // whole rule turns on: dropping it would say the opposite.
  assert.match(compressed, /grid only for/i, "the compressor must not drop the word the rule depends on");
  assert.match(compressed, /flex first/i);
});

test("the reminder carries it when CSS is on the table, and not otherwise", async () => {
  const { decorateWorkflowReminder } = await import("../../src/core/enforcement.js");
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
  const { loadAllSkills } = await import("../../src/core/skills.js");
  const { callTool } = await import("../../src/tools/router/index.js");
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
  // Source guards: both installers write the rules, and neither can be run
  // against a real home directory from a test.
  const installJs = readFileSync(join(root, "src", "cli", "install.js"), "utf8");
  const installSh = readFileSync(join(root, "scripts", "install.sh"), "utf8");
  assert.match(installJs, /flex first/i, "the instruction block written into CLAUDE.md must carry the rule");
  assert.match(installSh, /flex first/i, "the shell installer's rules block must carry the rule");
});

test("the docs carry it", () => {
  const agents = readFileSync(join(root, "docs", "04-agent-instructions.md"), "utf8");
  assert.match(agents, /flex first/i);
});

/** Escape a literal for use inside a RegExp. */
function escape(text) {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}
