

/** The ASCII arm: NO_UNICODE=1 forces the fallback glyphs and border. */

// The glyph set is chosen at module load, so this file sets the flag before
// importing and runs in its own process (node --test isolates test files).
// Static imports hoist past module code, so the flag must be set before a
// dynamic import: that ordering is the whole point of this file.
process.env.NO_UNICODE = "1";

import { strict as assert } from "node:assert";
import { test } from "node:test";

const { BORDER, GLYPHS } = await import("../_theme.js");

test("a unicode-free terminal gets the ASCII glyph set", () => {
  assert.equal(GLYPHS.checked, "[x]", "checked renders as text");
  assert.equal(GLYPHS.pointer, ">", "the pointer renders as text");
  assert.equal(GLYPHS.arrow, "->", "the arrow renders as text");
  assert.equal(BORDER, "classic", "the border matches the glyph set");
});
