

/** rule-handoff: the single options argument, the compact vocabulary, the help path. */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getPrompt, parseHandoffOptions, prompts } from "./_prompts.fixture.mjs";

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
    closeFeature: false,
    squash: false,
    compress: true,
    format: "full",
    includeGitDiff: true,
    includeGitLog: true,
    includeContext: true,
    includeAdrs: true,
    includeRoadmap: true,
    closeout: true,
    maxTokens: 0,
    help: false,
  };
  assert.deepEqual(parseHandoffOptions(), DEFAULTS, "no options = all defaults");
  assert.deepEqual(parseHandoffOptions(""), DEFAULTS, "empty options = all defaults");
  assert.equal(parseHandoffOptions("close-session").mode, "close-session");
  assert.equal(parseHandoffOptions("handoff").mode, "handoff");
  assert.equal(parseHandoffOptions("close-feature").closeFeature, true, "close-feature turns the feature close on");
  assert.equal(parseHandoffOptions("close-feature").squash, true, "close-feature implies squash");
  assert.equal(parseHandoffOptions("close-feature --squash").squash, true, "the legacy spelling still works");
  assert.equal(parseHandoffOptions("squash").squash, true, "squash turns the feature squash on");

  const c = parseHandoffOptions("compress minimal");
  assert.equal(c.compress, true, "compress token sets compress");
  assert.equal(c.format, "minimal", "minimal token sets format");
  assert.equal(parseHandoffOptions("no-compress").compress, false, "no-compress token clears compress");
  assert.equal(parseHandoffOptions("brief").format, "brief");
  assert.equal(parseHandoffOptions("full").format, "full");
  assert.equal(parseHandoffOptions("no-diff").includeGitDiff, false);
  assert.equal(parseHandoffOptions("no-log").includeGitLog, false);
  assert.equal(parseHandoffOptions("no-context").includeContext, false);
  assert.equal(parseHandoffOptions("no-adrs").includeAdrs, false);
  assert.equal(parseHandoffOptions("no-roadmap").includeRoadmap, false);
  assert.equal(parseHandoffOptions("no-archive").closeout, false, "no-archive turns the sweep off");
  assert.equal(parseHandoffOptions("handoff").closeout, true, "the sweep is on by default");
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
  assert.match(text, /rule_tool_handoff/, "message must still route to the tool");
});

test("close-feature plans one confirmed squash after persisting all feature documents", () => {
  const text = getPrompt("rule-handoff", { options: "close-feature" })
    .messages.map((message) => message.content?.text ?? "")
    .join("\n");

  assert.match(text, /action=squash force=true confirm=true/u, "the squash is implicit");
  assert.match(text, /ADRs and handoffs into one document each/u, "both document kinds are consolidated");
  assert.match(text, /ask the user to confirm/u, "history is not rewritten without consent");
  assert.doesNotMatch(text, /No squash was requested/u, "the close cannot leave feature commits untouched");
  assert.doesNotMatch(text, /if violations or merge commits are present.*stop until they are settled/iu, "the squash itself removes old violations and merges");
  assert.match(text, /breaking/u, "the final message must account for breaking changes across the range");
  assert.ok(text.indexOf("Step 4 - Persist the handoff") < text.indexOf("action=squash force=true confirm=true"), "the handoff must exist before the squash");
  assert.doesNotMatch(text.slice(text.indexOf("action=squash force=true confirm=true")), /Then commit that file ALONE/u, "nothing is committed after the close");
});

test("rule-handoff help returns the usage list as an instant assistant message", () => {
  const full = getPrompt("rule-handoff", { options: "help" });
  assert.equal(full.messages[0].role, "assistant", "handoff help must be an assistant message (no model call)");
  const text = full.messages[0].content.text;
  assert.match(text, /^Usage: \/rule-handoff/, "help message must start with the usage line");
  assert.match(text, /close-session/, "usage block must list close-session");
  assert.match(text, /close-feature.*squash/i, "usage must explain the implicit squash");
  assert.match(text, /no-compress/, "usage block must show a no-compress example");
  assert.match(text, /max=/i, "usage block must list the max token option");
  assert.ok(!/Do NOT call/i.test(text), "help must be pure content, no meta-instruction");
});
