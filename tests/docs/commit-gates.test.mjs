/** The two commit gates agree on one type list (OSS-19). */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { COMMIT_TYPES } from "../../scripts/build/commit-types/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TYPE_ALTERNATION = /\^\(([^)]+)\)\\\(/;

function hookTypes() {
  const hook = readFileSync(join(root, ".githooks", "commit-msg"), "utf8");
  const alternation = TYPE_ALTERNATION.exec(hook);

  assert.ok(alternation, "the hook carries no type alternation");

  return alternation[1].match(/[a-z]+/gu);
}

function semanticTypes() {
  const semantic = readFileSync(join(root, ".github", "semantic.yml"), "utf8");
  const at = semantic.search(/^types:\s*$/mu);
  const body = at === -1 ? "" : semantic.slice(at);

  return [...body.matchAll(/^\s*-\s*([a-z]+)\s*$/gmu)].map((match) => match[1]);
}

test("the hook and the PR title check share one type list", () => {
  assert.deepEqual(hookTypes(), COMMIT_TYPES, "the hook drifted from the source of truth");
  assert.deepEqual(semanticTypes(), COMMIT_TYPES, "semantic.yml drifted from the source of truth");
});
