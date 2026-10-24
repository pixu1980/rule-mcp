/**
 * `/rule-init` carries the same contract as `/webidoo-init`, adapted to what
 * `rule_tool_init` actually answers: idempotence, a per-item report that does
 * not turn `existing` or `refused` into success, the scaffold for a project
 * with no config yet, and the base branch the repository states.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { INIT_BODY } from "../_bodies-session.js";
import { listPrompts } from "../../../../prompts/index.js";

test("rule-init states that init is idempotent", () => {
  assert.match(INIT_BODY, /idempotent/i, "the body must say a second run is safe because nothing is replaced");
});

test("rule-init reports every item without inflating existing or refused", () => {
  assert.match(INIT_BODY, /\bexisting\b/, "a field that answers existing is not new work");
  assert.match(INIT_BODY, /\brefused\b/, "a field that answers refused is not a success");
});

test("rule-init scaffolds a project with no config yet, unless the options say no-scaffold", () => {
  assert.match(INIT_BODY, /rule_tool_detect/, "detection decides whether a scaffold is needed");
  assert.match(INIT_BODY, /mode=scaffold/, "the scaffold surface is the styleguide scaffold mode");
  assert.match(INIT_BODY, /no-scaffold/, "the option must be honored");
});

test("rule-init records the base branch the repository states", () => {
  assert.match(INIT_BODY, /rule-mcp\.baseBranch/, "a trunk that is not conventional is stated once in git config");
});

test("rule-init keeps the exact-pin dependency policy", () => {
  assert.match(INIT_BODY, /save-exact/, "the ranged specifiers init reports are pinned in the same run");
});

test("the rule-init prompt advertises the scaffold and its option", () => {
  const prompt = listPrompts().find((entry) => entry.name === "rule-init");

  assert.ok(prompt, "rule-init must be registered");
  assert.match(prompt.description, /scaffold/i, "the description names the scaffold step");
  assert.match(prompt.arguments[0].description, /no-scaffold/, "the option is part of the argument contract");
});
