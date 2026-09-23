

/** @module core/fix/js-style - the deterministic JavaScript style passes */

import { apply as blankBeforeReturn } from "./_blank-before-return.js";
import { apply as blankBetweenMethods } from "./_blank-between-methods.js";
import { apply as splitOneLiners } from "./_split-one-liners.js";
import { apply as constTop } from "./_const-top.js";
import { apply as blankBlocks } from "./_blank-blocks.js";

/** The passes, in the order the detectors expect. */
export const JS_STYLE_PASSES = [blankBeforeReturn, blankBetweenMethods, splitOneLiners, constTop, blankBlocks];

/**
 * Run every JavaScript style pass once, in the order the detectors expect.
 *
 * @param {string} text
 * @returns {{ text: string, changed: boolean }}
 */
export function applyJsStyle(text) {
  let current = text;
  let changed = false;

  for (const pass of JS_STYLE_PASSES) {
    const result = pass(current);

    current = result.text;
    changed = changed || result.changed;
  }

  return { text: current, changed };
}
