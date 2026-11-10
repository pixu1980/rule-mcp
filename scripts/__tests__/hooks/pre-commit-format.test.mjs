/**
The pre-commit step formats what the commit stages, and stages the result.

The CI formatting step is a gate, not a fixer: a `--write` inside the workflow
cannot come back to the commit, so it would report a clean run and leave the
tree unformatted. The fix belongs where the commit is made. This hook reads the
paths in the index, formats them with prettier, and stages them again.

The step reads the index instead of the working tree on purpose: `git add -u`
would stage every tracked modification, including the ones the commit leaves
out, and a hook that stages work nobody asked for is a hook people skip.
*/
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repo = new URL("../../..", import.meta.url).pathname;
const HOOK = readFileSync(join(repo, ".githooks", "pre-commit"), "utf8");

test("the hook formats the staged paths and stages them again", () => {
  assert.match(
    HOOK,
    /git diff --cached --name-only --diff-filter=ACMR -- '\*\.js' '\*\.mjs' '\*\.json' '\*\.md'/u,
    "the staged paths are read from the index, over the prettier extensions",
  );
  assert.match(HOOK, /node_modules\/\.bin\/prettier --write/u, "the step writes the formatting");
  assert.match(HOOK, /xargs -0 git add --/u, "the formatted files go back into the index");
});

test("a missing prettier or a failed format does not block the commit", () => {
  assert.match(HOOK, /\[ -d node_modules\/prettier \] \|\| exit 0/u, "no dev dependency, no formatting step");
  assert.match(HOOK, /prettier did not run; not blocking/u, "a failed format is reported, not fatal");
});

test("the formatting step runs after the census staging", () => {
  const census = HOOK.indexOf("git add docs/13-skills.md");
  const format = HOOK.indexOf("node_modules/.bin/prettier --write");

  assert.ok(census !== -1, "the census staging step is still there");
  assert.ok(format > census, "the census list must stay the first `git add` the census test reads");
});
