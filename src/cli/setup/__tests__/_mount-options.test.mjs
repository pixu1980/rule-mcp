/**
 * The wizard's Ink options: interactive mode is forced and incremental
 * rendering is on, which is what stops the full-frame repaint from flickering
 * on a terminal Ink would otherwise call non-interactive.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { wizardRenderOptions } from "../_mount.js";

test("the wizard forces interactive mode and incremental rendering", () => {
  const options = wizardRenderOptions();

  assert.equal(options.interactive, true, "Ink's CI detection is overridden");
  assert.equal(options.incrementalRendering, true, "only changed lines repaint");
  assert.equal(options.exitOnCtrlC, false, "the app owns Ctrl+C");
  assert.equal(options.patchConsole, true, "console output stays above the frame");
});
