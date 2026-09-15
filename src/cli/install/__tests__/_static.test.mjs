

/**
 * The repository's own instruction file carries the block an install writes.
 *
 * Drift here is expensive: the committed CLAUDE.md is rewritten by every
 * install run in this checkout, so a block that does not match what the
 * installer produces is a `pnpm format` diff on every developer machine.
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { INSTRUCTION_MARKER, RULES_MARKER, closingMarker } from "../../installers/_instruction.data.js";
import { appendInstruction } from "../../installers/_writers-text.js";

const projectClaude = readFileSync(new URL("../../../../CLAUDE.md", import.meta.url), "utf8");

test("the committed CLAUDE.md carries both blocks an install writes", () => {
  for (const marker of [INSTRUCTION_MARKER, RULES_MARKER]) {
    assert.ok(projectClaude.includes(marker), `CLAUDE.md must contain ${marker}`);
    assert.ok(projectClaude.includes(closingMarker(marker)), `CLAUDE.md must close ${marker}`);
  }
});

test("a re-install of this checkout would change nothing", () => {
  assert.equal(appendInstruction(projectClaude, { refresh: true }), projectClaude, "the committed blocks must be the current ones");
});
