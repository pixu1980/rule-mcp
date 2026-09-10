

/** @module core/text/ascii-box/width - display width, wide and zero-width ranges */

/**
 * Code points that occupy two terminal columns, and those that occupy none.
 *
 * The wide table is the East Asian Wide and Fullwidth blocks plus the emoji
 * ranges that render double-width everywhere it matters. It is not the full
 * Unicode width table - that would be a dependency for a rounding error - but
 * it covers every glyph this project has ever put inside a box.
 */
const WIDE_RANGES = [
  [0x11_00, 0x11_5f],
  [0x23_1a, 0x23_1b],
  [0x23_e9, 0x23_ec],
  [0x23_f0, 0x23_f0],
  [0x23_f3, 0x23_f3],
  [0x25_fd, 0x25_fe],
  [0x26_14, 0x26_15],
  [0x26_48, 0x26_53],
  [0x26_7f, 0x26_7f],
  [0x26_93, 0x26_93],
  [0x26_a1, 0x26_a1],
  [0x26_aa, 0x26_ab],
  [0x26_bd, 0x26_be],
  [0x26_c4, 0x26_c5],
  [0x26_ce, 0x26_ce],
  [0x26_d4, 0x26_d4],
  [0x26_ea, 0x26_ea],
  [0x26_f2, 0x26_f3],
  [0x26_f5, 0x26_f5],
  [0x26_fa, 0x26_fa],
  [0x26_fd, 0x26_fd],
  [0x27_05, 0x27_05],
  [0x27_0a, 0x27_0b],
  [0x27_28, 0x27_28],
  [0x27_4c, 0x27_4c],
  [0x27_4e, 0x27_4e],
  [0x27_53, 0x27_55],
  [0x27_57, 0x27_57],
  [0x27_95, 0x27_97],
  [0x27_b0, 0x27_b0],
  [0x27_bf, 0x27_bf],
  [0x2e_80, 0x30_3e],
  [0x30_41, 0x33_ff],
  [0x34_00, 0x4d_bf],
  [0x4e_00, 0x9f_ff],
  [0xa0_00, 0xa4_cf],
  [0xac_00, 0xd7_a3],
  [0xf9_00, 0xfa_ff],
  [0xfe_30, 0xfe_6f],
  [0xff_00, 0xff_60],
  [0xff_e0, 0xff_e6],
  [0x1_f0_00, 0x1_fa_ff],
  [0x2_00_00, 0x3_ff_fd],
];

/**
 * Combining marks, variation selectors and the zero-width joiner add nothing.
 *
 * Written as escapes rather than literal characters on purpose: this file is
 * itself run through the output passes, and a literal zero-width character in
 * a source file is exactly what those passes exist to remove.
 */
const ZERO_WIDTH_RANGES = [
  [0x03_00, 0x03_6f],
  [0x20_0b, 0x20_0d],
  [0xfe_00, 0xfe_0f],
];

/**
 * How many terminal columns a string occupies.
 *
 * @param {string} text
 * @returns {number}
 */
export function displayWidth(text) {
  if (typeof text !== "string") {
    return 0;
  }

  let width = 0;

  for (const character of text) {
    const code = character.codePointAt(0);

    if (ZERO_WIDTH_RANGES.some(([low, high]) => code >= low && code <= high)) {
      continue;
    }

    width += WIDE_RANGES.some(([low, high]) => code >= low && code <= high) ? 2 : 1;
  }

  return width;
}
