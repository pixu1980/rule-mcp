/** What earns a grid: the four flex-impossible cases, the stated reason, the counting. */
import { GUARDRAIL_ID, checkCode, run } from "./_flex.fixture.mjs";
import test from "node:test";
import assert from "node:assert/strict";

// ── The guardrail ─────────────────────────────────────────────────
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
