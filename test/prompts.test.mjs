/**
 * @module test/prompts
 *
 * Validates the MCP prompt registry (src/prompts/index.js):
 *   - structure: unique kebab-case names, strict argument schema, getPrompt impl
 *   - coverage: 5 workflow one-shot + 15 area prompts + 3 legacy prompts
 *   - content rules: every prompt message proposes a commit with scope and
 *     involves TDD/a11y baselines (or asks the user what to do)
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { listPrompts, getPrompt } from "../src/prompts/index.js";

console.log("prompts registry test");

// ── Expected registry ────────────────────────────────────────────

const WORKFLOW_PROMPTS = [
  "rule-setup-project",
  "rule-new-feature",
  "rule-pull-request",
  "rule-write-tests",
  "rule-handoff",
];

const AREA_PROMPTS = [
  "rule-meta",
  "rule-frontend",
  "rule-backend",
  "rule-data",
  "rule-toolchain",
  "rule-styleguide",
  "rule-process",
  "rule-devops",
  "rule-platform",
  "rule-caveman",
  "rule-architect",
  "rule-ai",
  "rule-skills",
  "rule-tdd",
  "rule-ui",
];

const LEGACY_PROMPTS = [
  "rule-code-review",
  "rule-a11y-audit",
  "rule-architect-scaffold",
];

const EXPECTED = [...WORKFLOW_PROMPTS, ...AREA_PROMPTS, ...LEGACY_PROMPTS];

// ── Structure ────────────────────────────────────────────────────

const prompts = listPrompts();
const names = prompts.map((p) => p.name);

test("names are unique and kebab-case", () => {
  assert.equal(new Set(names).size, names.length, "prompt names must be unique");
  for (const n of names) {
    assert.match(n, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${n} must be kebab-case`);
  }
});

test("prompts are listed in alphabetical order", () => {
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(names, sorted, "prompt names must be listed alphabetically");
});

test("registry covers workflow, all 15 areas, and the 3 legacy prompts", () => {
  for (const expected of EXPECTED) {
    assert.ok(names.includes(expected), `missing prompt ${expected}`);
  }
  assert.equal(names.length, EXPECTED.length, "no unexpected prompts");
});

test("strict argument schema on every prompt", () => {
  for (const p of prompts) {
    assert.ok(p.description && p.description.length > 0, `${p.name}: description required`);
    assert.ok(Array.isArray(p.arguments) && p.arguments.length > 0, `${p.name}: arguments required`);
    assert.ok(p.arguments.some((a) => a.required === true), `${p.name}: at least one required argument`);
    for (const a of p.arguments) {
      assert.ok(a.name && a.name.length > 0, `${p.name}: argument name required`);
      assert.ok(a.description && a.description.length > 0, `${p.name}: argument ${a.name} needs a description`);
      assert.equal(typeof a.required, "boolean", `${p.name}: argument ${a.name} required must be boolean`);
    }
  }
});

test("every listed prompt has a getPrompt implementation with messages", () => {
  for (const p of prompts) {
    const full = getPrompt(p.name);
    assert.ok(full, `${p.name}: getPrompt returned null`);
    assert.ok(Array.isArray(full.messages) && full.messages.length > 0, `${p.name}: messages required`);
    const text = full.messages
      .map((m) => m.content?.text ?? "")
      .join("\n");
    assert.ok(text.length > 0, `${p.name}: message text required`);
  }
});

test("refactor: rule-area- prefix gone, a11y merged into rule-a11y-audit, rule-generate-component removed", () => {
  const names = listPrompts().map((p) => p.name);
  assert.ok(!names.some((n) => n.startsWith("rule-area-")), "no rule-area- prefixed prompt must remain");
  for (const removed of ["rule-generate-component", "rule-a11y-test", "rule-a11y-review"]) {
    assert.ok(!names.includes(removed), `${removed} must be removed`);
  }
  const audit = getPrompt("rule-a11y-audit");
  assert.ok(audit, "rule-a11y-audit must exist");
  const text = audit.messages.map((m) => m.content?.text ?? "").join("\n");
  assert.match(text, /WCAG 2\.2 AA/, "rule-a11y-audit must review WCAG 2.2 AA compliance");
  assert.match(text, /axe-core|AxeBuilder/, "rule-a11y-audit must generate axe-core tests");
  assert.match(text, /tests\/a11y/, "rule-a11y-audit must cover the tests/a11y suite");
});

// ── Content rules (commit scope + TDD/a11y baselines) ────────────

test("every prompt ends with a commit-scope proposal and involves TDD/a11y or asks the user", () => {
  for (const p of prompts) {
    const text = getPrompt(p.name).messages.map((m) => m.content?.text ?? "").join("\n");
    const commitWithScope = /commit/i.test(text) && /scope/i.test(text);
    assert.ok(commitWithScope, `${p.name}: must propose a commit with scope`);
    const baselines = /tdd|a11y|test/i.test(text) || /ask/i.test(text);
    assert.ok(baselines, `${p.name}: must involve TDD/a11y baselines or ask the user what to do`);
  }
});

console.log(`\nprompts registry: all checks passed (${prompts.length} prompts)`);
