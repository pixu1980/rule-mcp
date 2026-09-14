/**
 * Install then uninstall must give the file back byte for byte.
 *
 * The rules block is appended to files a user owns - CLAUDE.md, AGENTS.md,
 * .cursorrules - so an install/uninstall cycle that left a blank line behind
 * churned those files forever, and `pnpm format` churned them again. This was
 * asserted by extracting the bash functions out of the two scripts; the
 * functions are node now (ADR 080).
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { appendInstruction, removeInstruction } from "../../installers/_writers-text.js";
import { INSTRUCTION_MARKER, RULES_MARKER } from "../../installers/_instruction.data.js";

const cycle = (text) => removeInstruction(appendInstruction(text));

test("a fresh cycle restores the exact original bytes", () => {
  assert.equal(cycle("line1\nline2\n"), "line1\nline2");
  assert.equal(cycle(""), "");
});

test("three cycles accumulate nothing", () => {
  let text = "line1";

  for (let round = 0; round < 3; round += 1) {
    text = cycle(text);
  }

  assert.equal(text, "line1");
});

test("one install inserts exactly one blank separator before each marker", () => {
  const written = appendInstruction("line1\n");

  for (const marker of [INSTRUCTION_MARKER, RULES_MARKER]) {
    const before = written.slice(0, written.indexOf(marker));

    assert.match(before, /[^\n]\n\n$/, `${marker} must be preceded by exactly one blank line`);
  }

  assert.ok(written.endsWith("\n"), "the file ends with a newline, as every file does");
});

test("a file that never carried the block is returned untouched", () => {
  const text = "line1\n\n\n";

  assert.equal(removeInstruction(text), text, "a removal with nothing to remove must not reformat the file");
});
