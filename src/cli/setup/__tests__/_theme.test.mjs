/** statusStyle maps every status, supportsUnicode reads the terminal. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { COLORS, GLYPHS, BORDER, statusStyle, supportsUnicode } from "../_theme.js";
import { withEnv } from "../../../shared/_testkit.js";

const LOCALE_KEYS = ["NO_UNICODE", "LC_ALL", "LC_CTYPE", "LANG"];

function clearLocale() {
  const patch = {};

  for (const key of LOCALE_KEYS) {
    patch[key] = undefined;
  }

  return patch;
}

test("supportsUnicode refuses the terminal when NO_UNICODE is set", () => {
  withEnv({ NO_UNICODE: "1", LC_ALL: "en_US.UTF-8" }, () => {
    assert.equal(supportsUnicode(), false, "NO_UNICODE wins over the locale");
  });
});

test("supportsUnicode trusts a UTF-8 locale", () => {
  withEnv({ ...clearLocale(), LC_ALL: "en_US.UTF-8" }, () => {
    assert.equal(supportsUnicode(), true, "a UTF-8 LC_ALL reads as unicode-safe");
  });
});

test("supportsUnicode distrusts a bare locale everywhere but Windows", () => {
  withEnv({ ...clearLocale(), LANG: "C" }, () => {
    assert.equal(supportsUnicode(), process.platform === "win32", "a C locale is only trusted on win32");
  });
});

test("statusStyle maps every task status onto its glyph and color", () => {
  assert.deepEqual(statusStyle("ok"), { glyph: GLYPHS.ok, color: COLORS.ok });
  assert.deepEqual(statusStyle("warn"), { glyph: GLYPHS.warn, color: COLORS.warn });
  assert.deepEqual(statusStyle("fail"), { glyph: GLYPHS.fail, color: COLORS.fail });
  assert.deepEqual(statusStyle("skip"), { glyph: GLYPHS.skip, color: COLORS.muted });
  assert.deepEqual(statusStyle("stale"), { glyph: GLYPHS.pending, color: COLORS.muted }, "unknown statuses read as pending");
  assert.equal(typeof BORDER, "string", "the border style is set at load");
});
