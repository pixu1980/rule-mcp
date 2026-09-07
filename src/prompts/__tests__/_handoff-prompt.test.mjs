/** The handoff prompt: resolved options flow into the rendered instructions. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { parseHandoffOptions } from "../_handoff-options.js";
import { handoffPrompt } from "../_handoff-prompt.js";

const user = (text) => [{ type: "text", text }];

test("parseHandoffOptions applies every token and ignores the unknown", () => {
  const options = parseHandoffOptions("close-session no-compress brief no-diff no-timeline max=5000 whatever");

  assert.equal(options.mode, "close-session", "the mode resolves");
  assert.equal(options.compress, false, "no-compress wins");
  assert.equal(options.format, "brief", "the format resolves");
  assert.equal(options.includeGitDiff, false, "no-diff clears the diff");
  assert.equal(options.maxTokens, 5000, "max tokens parse");
  assert.equal(options.includeGitLog, true, "untouched flags keep defaults");
});

test("parseHandoffOptions defaults, short-circuits and reports help", () => {
  const defaults = parseHandoffOptions(undefined);
  assert.equal(defaults.mode, "handoff", "the default mode is handoff");
  assert.equal(defaults.compress, true, "compress defaults on");
  assert.equal(defaults.format, "full", "the default format is full");

  const help = parseHandoffOptions("help");
  assert.equal(help.help, true, "help is surfaced");
});

test("handoffPrompt renders an option-agnostic contract with the defaults", () => {
  const prompt = handoffPrompt({}, user);
  assert.equal(prompt.name, "rule-handoff", "the prompt names itself");
  assert.match(prompt.messages[0].text, /mode=handoff/, "the default mode is spelled out");
  assert.match(prompt.messages[0].text, /compress=true/, "the compress default is spelled out");
  assert.match(prompt.messages[0].text, /includeGitDiff=yes/, "the diff flag is spelled out");
  assert.match(prompt.messages[0].text, /maxTokens=0/, "the token default is spelled out");
});

test("handoffPrompt renders the resolved overrides", () => {
  const prompt = handoffPrompt({ options: "close-session no-diff max=7777" }, user);
  const text = prompt.messages[0].text;
  assert.match(text, /mode=close-session/, "the close-session mode renders");
  assert.match(text, /includeGitDiff=no/, "the diff is off");
  assert.match(text, /maxTokens=7777/, "the token limit renders");
});

test("handoffPrompt renders every include flag off when so requested", () => {
  const prompt = handoffPrompt({ options: "no-diff no-log no-context no-adrs no-roadmap" }, user);
  const text = prompt.messages[0].text;
  for (const flag of ["includeGitDiff=no", "includeGitLog=no", "includeContext=no", "includeAdrs=no", "includeRoadmap=no"]) {
    assert.match(text, new RegExp(flag.replace("=", "=")), flag + " is spelled out");
  }
});
