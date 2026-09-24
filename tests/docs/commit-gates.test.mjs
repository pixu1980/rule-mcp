/** The two commit gates agree on one type list (OSS-19). */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { COMMIT_TYPES, isSystemSubject, SYSTEM_MESSAGE_PREFIXES } from "../../scripts/build/commit-types/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The `commit-msg` hook, which must delegate rather than carry its own rule. */
function commitMsgHook() {
  return readFileSync(join(root, ".githooks", "commit-msg"), "utf8");
}

function semanticTypes() {
  const semantic = readFileSync(join(root, ".github", "semantic.yml"), "utf8");
  const at = semantic.search(/^types:\s*$/mu);
  const body = at === -1 ? "" : semantic.slice(at);

  return [...body.matchAll(/^\s*-\s*([a-z]+)\s*$/gmu)].map((match) => match[1]);
}

test("the commit-msg hook delegates to the shared validator", () => {
  const hook = commitMsgHook();

  assert.match(hook, /commit-types\/index\.mjs --msg-file/u, "the hook must call the shared entry point");
  assert.doesNotMatch(hook, /feat\|fix\|docs/u, "the type list lives in src/core/commit, not in the hook");
});

test("the PR title check shares the one type list", () => {
  assert.deepEqual(semanticTypes(), COMMIT_TYPES, "semantic.yml drifted from the source of truth");
});

/* The hook exempts system-generated messages, which cannot carry a scope
 * ("Merge pull request #12 from ...", GitHub's merge ref "Merge <sha> into
 * <sha>", and "Revert \"...\""). The CI linter must exempt exactly the same
 * subjects or a bot-perfect gate still fails that gate (merge ref in range).
 */
function systemSubjects() {
  const hook = commitMsgHook();
  const at = hook.search(/case "\$first" in/u);
  const block = at === -1 ? "" : hook.slice(at, hook.indexOf(";;", at));

  return [...block.matchAll(/"([A-Za-z]+) "\*/gmu)].map((match) => match[1]);
}

test("the CI linter exempts the same system subjects as the hook", () => {
  assert.deepEqual(systemSubjects(), SYSTEM_MESSAGE_PREFIXES, "the linter drifted from the hook's exemption list");
});

test("system-generated subjects are exempt from the scope check", () => {
  const mergeRef = "Merge 9195216557deeb144e30b3fa5c33d769d23cd107 into d8788ed08900d63031cfb582c971c70996836e11";
  const mergePr = "Merge pull request #12 from pixu1980/fix-workflows";
  const revert = 'Revert "feat(skills): add rule naming"';

  for (const subject of [mergeRef, mergePr, revert]) {
    assert.equal(isSystemSubject(subject), true, `${subject} must be exempt`);
  }

  assert.equal(isSystemSubject("feat(skills): add rule naming"), false);
  assert.equal(isSystemSubject("docs: missing scope is still rejected"), false);
});
