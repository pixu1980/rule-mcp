

/** The hook-block surgery on empty, absent and damaged input. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { HOOK_END, HOOK_START, hasHook, repairOrphanFi, withHook, withoutHook } from "../_git-hook.js";

test("the sentinels and the block survive a round trip", () => {
  const added = withHook("");

  assert.ok(hasHook(added), "withHook plants a block hasHook sees");

  const removed = withoutHook(added);

  assert.equal(removed, "#!/bin/sh\n", "the shebang stays, the block goes");
  assert.equal(hasHook(removed), false, "the sentinels are gone with the block");
});

test("absent and empty hook text behaves as no hook", () => {
  assert.equal(hasHook(), false, "absent text carries no block");
  assert.equal(hasHook(""), false, "empty text carries no block");

  const added = withHook();

  assert.ok(added.startsWith("#!/bin/sh"), "an absent hook gets a shebang");
  assert.ok(hasHook(added), "the planted block is found");
});

test("repairOrphanFi drops a fi with no open if and keeps a balanced one", () => {
  assert.equal(repairOrphanFi(), "", "absent text repairs to empty");
  assert.equal(repairOrphanFi(["fi", 'echo "alive"'].join("\n")), 'echo "alive"', "the orphan fi is dropped, the rest survives");
  assert.equal(repairOrphanFi(["if true; then", 'echo "in"'].join("\n") + "\nfi"), ["if true; then", 'echo "in"', "fi"].join("\n"), "a balanced block is untouched");
});

test("withoutHook keeps surrounding content and repairs the damage leftovers leave", () => {
  const text = [`#!/bin/sh`, `echo "before"`, HOOK_START, "body", HOOK_END, `echo "after"`, ""].join("\n");

  assert.equal(withoutHook(text), [`#!/bin/sh`, `echo "before"`, `echo "after"`, ""].join("\n"), "the block and its separator line are removed, the rest stays");
  assert.equal(withoutHook(), "", "absent text removes to empty");
});
