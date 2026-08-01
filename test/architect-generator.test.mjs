// test/architect-generator.test.mjs
// Locks the canonical .context/ generator behavior before the servers are
// switched to import it (Phase 1 refactor is output-preserving).
import test from "node:test";
import assert from "node:assert/strict";
import { generateContextContent } from "../skills/rule-architect/generator.mjs";

const FIXTURE = { PROJECT_NAME: "AcmeApp" };

test("generator returns one entry per emitted template with the documented shape", () => {
  const files = generateContextContent(FIXTURE, null);
  assert.ok(Array.isArray(files));
  // 24 templates.json entries + 6 fanned-out per-tool entry files (Phase 6,
  // Task 2: CLAUDE.md, GEMINI.md, .clinerules, Copilot, Cursor, Windsurf —
  // same AGENTS.md body rendered once, re-framed per tool), MINUS the 3
  // templates gated behind `emitWhen` PROJECT_TYPE=other (Phase 5, Task 2):
  // specs/03-calculation-engine.md, specs/04-ruleset-config.md and
  // schemas/ruleset.schema.json. This fixture has no PROJECT_TYPE, so the
  // gate correctly withholds them.
  assert.equal(files.length, 27, "expected 24 templates - 3 gated + 6 fanned-out entry files");
  for (const f of files) {
    assert.equal(typeof f.path, "string");
    assert.equal(typeof f.content, "string");
    assert.equal(typeof f.filled, "number");
    assert.equal(typeof f.unfilled, "number");
  }
});

test("the gated templates appear once PROJECT_TYPE warrants them", () => {
  const files = generateContextContent({ ...FIXTURE, PROJECT_TYPE: "other" }, null);
  assert.equal(files.length, 30, "all 24 templates + 6 fanned-out entry files");
});

test("known placeholder is filled; unfilled placeholders leave no bracket token", () => {
  const files = generateContextContent(FIXTURE, null);
  // TEMPLATE_GUIDE.md is a `raw` template — it documents the placeholder
  // syntax, so its literal [KEY] tokens are the content and are exempt.
  const all = files
    .filter((f) => f.path !== "TEMPLATE_GUIDE.md")
    .map((f) => f.content)
    .join("\n");

  assert.ok(all.includes("AcmeApp"), "PROJECT_NAME value should appear");
  // Phase 5 replaced the old `**[KEY]**` bold marker with the lean policy:
  // drop the line, or an inline `_TODO: KEY_` that carries no bracket token.
  assert.doesNotMatch(all, /\*\*\[[A-Z_0-9]+\]\*\*/, "the bold unfilled marker is gone");
  assert.match(all, /_TODO: [A-Z_0-9]+/, "unfilled inline placeholders become TODO markers");
});

test("answer values are substituted literally — $ patterns are not interpreted", () => {
  // String.replaceAll(str, str) honors $&, $$, $` and $' in the REPLACEMENT,
  // so a user answer of "Cost $5" or "A$&B" (pricing text, or hostile input)
  // would be mangled by the substitution. The value must land verbatim.
  const cases = [
    ["A$&B", "A$&B"], // $& used to reinject the matched [PROJECT_NAME] token
    ["Pay $$5", "Pay $$5"], // $$ used to collapse to a single $
    ["Ends $' here", "Ends $' here"], // $' used to inject the text after the match
    ["Price $100 total", "Price $100 total"],
  ];
  for (const [value, expected] of cases) {
    const files = generateContextContent({ PROJECT_NAME: value }, null);
    const agents = files.find((f) => f.path === "AGENTS.md");
    assert.ok(
      agents.content.includes(expected),
      `${JSON.stringify(value)} must appear verbatim; first line was ${JSON.stringify(agents.content.split("\n")[0])}`
    );
  }
});
