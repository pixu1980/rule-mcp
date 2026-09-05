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
import { parseHandoffOptions } from "../src/prompts/handoff-options.js";

console.log("prompts registry test");

// ── Expected registry ────────────────────────────────────────────

const WORKFLOW_PROMPTS = ["rule-setup-project", "rule-new-feature", "rule-pull-request", "rule-write-tests", "rule-handoff"];

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
  "rule-ai",
  "rule-skills",
  "rule-tdd",
  "rule-ui",
];

const LEGACY_PROMPTS = ["rule-code-review", "rule-a11y-audit"];

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

test("registry covers workflow, area, one-shot, and persona prompts", () => {
  for (const expected of EXPECTED) {
    assert.ok(names.includes(expected), `missing prompt ${expected}`);
  }
  // 21 target prompts + 6 one-shot workflow prompts (adr/check/flight/handon/
  // init/update) + 7 review-persona prompts (rule-plan-<role>) = 34.
  assert.equal(names.length, EXPECTED.length + 13, "no unexpected prompts");
});

test("strict argument schema on every prompt", () => {
  for (const p of prompts) {
    assert.ok(p.description && p.description.length > 0, `${p.name}: description required`);
    assert.ok(Array.isArray(p.arguments) && p.arguments.length > 0, `${p.name}: arguments required`);
    // A prompt may have zero required arguments only when every optional
    // argument documents its default, so a bare invocation is well-defined.
    const allOptionalWithDefaults = p.arguments.every((a) => a.required === false && /default:/i.test(a.description));
    assert.ok(
      p.arguments.some((a) => a.required === true) || allOptionalWithDefaults,
      `${p.name}: at least one required argument, or every optional argument must document its default`,
    );
    for (const a of p.arguments) {
      assert.ok(a.name && a.name.length > 0, `${p.name}: argument name required`);
      assert.ok(a.description && a.description.length > 0, `${p.name}: argument ${a.name} needs a description`);
      assert.equal(typeof a.required, "boolean", `${p.name}: argument ${a.name} required must be boolean`);
    }
  }
});

test("rule-handoff takes a single free-form options argument", () => {
  const p = prompts.find((x) => x.name === "rule-handoff");
  assert.ok(p, "rule-handoff exists");
  assert.deepEqual(
    p.arguments.map((a) => a.name),
    ["options"],
    "single options argument, no required mode",
  );
  const options = p.arguments[0];
  assert.equal(options.required, false, "options must be optional so /rule-handoff works bare");
  assert.match(options.description, /default:/i, "options must document its default");
  assert.match(options.description, /help/i, "options must advertise the help token");
  assert.match(options.description, /close-session/, "options must list the close-session mode");

  const text = getPrompt("rule-handoff")
    .messages.map((m) => m.content?.text ?? "")
    .join("\n");
  assert.match(text, /default/i, "handler text must mention the defaults");
  assert.match(text, /close-session/, "handler text must explain the close-session mode");
});

test("parseHandoffOptions translates the compact vocabulary", () => {
  const DEFAULTS = {
    mode: "handoff",
    compress: false,
    format: "full",
    includeGitDiff: true,
    includeGitLog: true,
    includeContext: true,
    includeAdrs: true,
    includeRoadmap: true,
    maxTokens: 0,
    help: false,
  };
  assert.deepEqual(parseHandoffOptions(), DEFAULTS, "no options = all defaults");
  assert.deepEqual(parseHandoffOptions(""), DEFAULTS, "empty options = all defaults");
  assert.equal(parseHandoffOptions("close-session").mode, "close-session");
  assert.equal(parseHandoffOptions("handoff").mode, "handoff");

  const c = parseHandoffOptions("compress minimal");
  assert.equal(c.compress, true, "compress token sets compress");
  assert.equal(c.format, "minimal", "minimal token sets format");
  assert.equal(parseHandoffOptions("brief").format, "brief");
  assert.equal(parseHandoffOptions("full").format, "full");
  assert.equal(parseHandoffOptions("no-diff").includeGitDiff, false);
  assert.equal(parseHandoffOptions("no-log").includeGitLog, false);
  assert.equal(parseHandoffOptions("no-context").includeContext, false);
  assert.equal(parseHandoffOptions("no-adrs").includeAdrs, false);
  assert.equal(parseHandoffOptions("no-roadmap").includeRoadmap, false);
  assert.equal(parseHandoffOptions("max=2000").maxTokens, 2000);
  assert.equal(parseHandoffOptions("max=0").maxTokens, 0);

  const combo = parseHandoffOptions("close-session no-diff no-log compress max=500");
  assert.equal(combo.mode, "close-session");
  assert.equal(combo.includeGitDiff, false);
  assert.equal(combo.includeGitLog, false);
  assert.equal(combo.compress, true);
  assert.equal(combo.maxTokens, 500);

  for (const h of ["help", "--help", "-h"]) {
    assert.equal(parseHandoffOptions(h).help, true, `${h} must set help`);
  }
});

test("rule-handoff getPrompt interpolates the parsed options into the message", () => {
  const text = getPrompt("rule-handoff", { options: "close-session compress minimal" })
    .messages.map((m) => m.content?.text ?? "")
    .join("\n");
  assert.match(text, /close-session/, "message must carry the requested mode");
  assert.match(text, /compress=true/, "message must carry compress=true");
  assert.match(text, /format=minimal/, "message must carry format=minimal");
  assert.match(text, /rule_tool_process_handoff/, "message must still route to the tool");
});

test("rule-handoff help returns the usage list as an instant assistant message", () => {
  const full = getPrompt("rule-handoff", { options: "help" });
  assert.equal(full.messages[0].role, "assistant", "handoff help must be an assistant message (no model call)");
  const text = full.messages[0].content.text;
  assert.match(text, /^Usage: \/rule-handoff/, "help message must start with the usage line");
  assert.match(text, /close-session/, "usage block must list close-session");
  assert.match(text, /compress minimal/, "usage block must show the compress minimal example");
  assert.match(text, /max=/i, "usage block must list the max token option");
  assert.ok(!/Do NOT call/i.test(text), "help must be pure content, no meta-instruction");
});

test("every listed prompt has a getPrompt implementation with messages", () => {
  for (const p of prompts) {
    const full = getPrompt(p.name);
    assert.ok(full, `${p.name}: getPrompt returned null`);
    assert.ok(Array.isArray(full.messages) && full.messages.length > 0, `${p.name}: messages required`);
    const text = full.messages.map((m) => m.content?.text ?? "").join("\n");
    assert.ok(text.length > 0, `${p.name}: message text required`);
  }
});

test("refactor: rule-area- prefix gone, a11y merged into rule-a11y-audit, rule-generate-component removed", () => {
  const names = listPrompts().map((p) => p.name);
  assert.ok(
    names.every((n) => !n.startsWith("rule-area-")),
    "no rule-area- prefixed prompt must remain",
  );
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

test("every prompt exposes exactly one argument", () => {
  for (const p of prompts) {
    assert.equal(p.arguments.length, 1, `${p.name} must expose exactly one argument (the free-form primary)`);
  }
});

test("every prompt supports /<name> help as an instant assistant message", () => {
  for (const p of prompts) {
    const argument = p.arguments[0];
    for (const token of ["help", "--help", "-h"]) {
      const full = getPrompt(p.name, { [argument.name]: token });
      assert.ok(full, `${p.name}: getPrompt with ${token} must return a prompt`);
      assert.equal(full.messages.length, 1, `${p.name}: help must be a single message`);
      assert.equal(
        full.messages[0].role,
        "assistant",
        `${p.name}: ${token} help must be an assistant message (shown instantly, no model call)`,
      );
      const text = full.messages[0].content.text;
      assert.match(text, /^Usage: \/rule-/, `${p.name}: ${token} must start with the usage line`);
      assert.ok(!/Do NOT call/i.test(text), `${p.name}: ${token} help must be pure content, no meta-instruction`);
    }
  }
});

test("every prompt ends with a commit-scope proposal and involves TDD/a11y or asks the user", () => {
  for (const p of prompts) {
    const text = getPrompt(p.name)
      .messages.map((m) => m.content?.text ?? "")
      .join("\n");
    const isCommitWithScope = /commit/i.test(text) && /scope/i.test(text);
    assert.ok(isCommitWithScope, `${p.name}: must propose a commit with scope`);
    const isBaselines = /tdd|a11y|test/i.test(text) || /ask/i.test(text);
    assert.ok(isBaselines, `${p.name}: must involve TDD/a11y baselines or ask the user what to do`);
  }
});

console.log(`\nprompts registry: all checks passed (${prompts.length} prompts)`);
