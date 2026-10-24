/** WS3 - the one Conventional Commit rule. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { COMMIT_TYPES, explainViolation, isKnownType, isSystemSubject, parseCommitMessage, violationHelp } from "../index.js";

test("a scoped subject parses into its parts", () => {
  const parsed = parseCommitMessage("feat(auth): add OAuth authentication\n\nBody here.");

  assert.equal(parsed.valid, true, "the subject is valid");
  assert.equal(parsed.type, "feat", "the type is read");
  assert.equal(parsed.scope, "auth", "the scope is read");
  assert.equal(parsed.description, "add OAuth authentication", "the description is read");
  assert.equal(parsed.body, "\nBody here.", "the body is kept");
  assert.equal(parsed.breaking, false, "a plain feature is not breaking");
});

test("a scope-less subject is rejected with a specific reason", () => {
  const parsed = parseCommitMessage("feat: add authentication");

  assert.equal(parsed.valid, false, "a missing scope is rejected");
  assert.match(explainViolation("feat: add authentication"), /missing scope/u, "the reason names the scope");
});

test("an unknown type is rejected and the accepted list is named", () => {
  const reason = explainViolation("feature(auth): add authentication");

  assert.match(reason, /"feature" is not an accepted type/u, "the reason quotes the type");
  assert.match(reason, /feat, fix/u, "the reason lists the accepted types");
});

test("a missing separator and an empty description have their own reasons", () => {
  assert.match(explainViolation("feat(auth) add authentication"), /separator/u, "the separator is named");
  assert.match(explainViolation("feat(auth):"), /description after/u, "the empty description is named");
  assert.match(explainViolation("Added authentication"), /not an accepted type/u, "a sentence is not a commit");
  assert.match(explainViolation(""), /empty/u, "an empty subject is named");
});

test("every accepted type validates", () => {
  for (const type of COMMIT_TYPES) {
    assert.equal(isKnownType(type), true, `${type} must be accepted`);
    assert.equal(parseCommitMessage(`${type}(scope): a subject`).valid, true, `${type}(scope) must validate`);
  }
});

test("the bang and the footer both mark a breaking change", () => {
  const bang = parseCommitMessage("feat(api)!: replace the authentication API");

  assert.equal(bang.valid, true, "the bang form is valid");
  assert.equal(bang.breaking, true, "the bang marks it breaking");

  const footer = parseCommitMessage("feat(api): replace the authentication API\n\nBREAKING CHANGE: the v1 endpoint is gone");

  assert.equal(footer.breaking, true, "the footer marks it breaking");

  const hyphen = parseCommitMessage("feat(api): replace it\n\nBREAKING-CHANGE: the v1 endpoint is gone");

  assert.equal(hyphen.breaking, true, "the hyphenated footer is recognized");
});

test("system-generated subjects are exempt", () => {
  assert.equal(isSystemSubject("Merge pull request #12 from pixu1980/x"), true, "a PR merge is exempt");
  assert.equal(isSystemSubject('Revert "feat(skills): add rule-mcp naming"'), true, "a revert is exempt");
  assert.equal(isSystemSubject("feat(skills): add rule-mcp naming"), false, "a real commit is not exempt");
});

test("the help block shows a valid example and quotes what was rejected", () => {
  const help = violationHelp("docs: missing scope");

  assert.match(help, /type\(scope\): subject/u, "the format is shown");
  assert.match(help, /feat\(skills\): add rule-mcp naming/u, "a valid example is shown");
  assert.match(help, /got:\s+docs: missing scope/u, "the rejected subject is quoted");
});
