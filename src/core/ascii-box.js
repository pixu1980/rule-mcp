/**
 * @module core/ascii-box
 *
 * Makes a drawn box an actual rectangle.
 *
 * A diagram whose right edge steps in and out by a column is the one AI
 * fingerprint a spell-check cannot see. It happens because the characters are
 * chosen a line at a time and nothing counts the columns, and it is immediately
 * visible to a reader who would otherwise have trusted the diagram.
 *
 * The pass is deliberately narrow. It pads short frame lines out to the widest
 * line of the same box and it does nothing else: it never truncates, never
 * moves an inner separator, never invents a missing border, and never touches a
 * line that is not part of a box. Anything it cannot fix safely it leaves for
 * `findRaggedBoxes` to report.
 *
 * Boxes are grouped by their opening corner and its indentation, so a small
 * inset box beside a full-width one keeps its own size rather than being
 * stretched to match.
 *
 * @see src/tools/router - where it runs on every tool result
 * @see src/core/guardrail-defs - fp-box-rectangular, the guard
 * @see scripts/clean-prose - the same pass over this repository's own files
 */

/** Opening corners. A box starts here. */
const TOP_LEFT = "┌╔┏╭";
/** Closing corners. A box at the same indentation ends here. */
const BOTTOM_LEFT = "└╚┗╰";
/** Everything that can begin or end a frame line. */
const FRAME = "│║┃┆┇┊┋┌┍┎┏┐┑┒┓└┕┖┗┘┙┚┛├┝┞┟┠┡┢┣┤┥┦┧┨┩┪┫┬┭┮┯┰┱┲┳┴┵┶┷┸┹┺┻┼╁╂╃╄╅╆╇╈╉╊╋╔╗╚╝╠╣╦╩╬╭╮╯╰";
/** Horizontal fills. Padding a border repeats the fill it is drawn from. */
const FILL = "─═━┄┅┈┉╌╍";

const FRAME_SET = new Set(FRAME);
const FILL_SET = new Set(FILL);
const TOP_SET = new Set(TOP_LEFT);
const BOTTOM_SET = new Set(BOTTOM_LEFT);

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

/** @param {string} line @returns {string} the leading whitespace */
function indentOf(line) {
  return line.slice(0, line.length - line.trimStart().length);
}

/**
 * Is this a frame line: a box character at both ends of its trimmed content?
 *
 * Requiring both ends is what keeps prose, tree diagrams and markdown tables
 * out. A tree branch (`├── src/`) opens with a frame character and closes with
 * a filename, so it is left exactly as written.
 *
 * @param {string} line
 * @returns {boolean}
 */
function isFrameLine(line) {
  const body = line.trim();

  if (body.length < 2) {
    return false;
  }

  const characters = [...body];

  return FRAME_SET.has(characters[0]) && FRAME_SET.has(characters.at(-1));
}

/** @param {string} line @returns {string} the first non-space character, or "" */
function openingCharacter(line) {
  return [...line.trim()][0] ?? "";
}

/**
 * Find every complete box: an opening corner, then frame lines at the same
 * indentation, then a closing corner. A box that never closes is skipped here
 * and reported by findRaggedBoxes instead.
 *
 * @param {string[]} lines
 * @returns {Array<{ start: number, end: number }>}
 */
function findBoxes(lines) {
  const boxes = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!isFrameLine(line) || !TOP_SET.has(openingCharacter(line))) {
      continue;
    }

    const indent = indentOf(line);
    let end = -1;

    for (let scan = index + 1; scan < lines.length; scan += 1) {
      const candidate = lines[scan];

      if (!isFrameLine(candidate) || indentOf(candidate) !== indent) {
        break;
      }

      if (BOTTOM_SET.has(openingCharacter(candidate))) {
        end = scan;
        break;
      }

      if (TOP_SET.has(openingCharacter(candidate))) {
        break;
      }
    }

    if (end === -1) {
      continue;
    }

    boxes.push({ start: index, end });
    index = end;
  }

  return boxes;
}

/**
 * Pad one frame line out to a target width, repeating whatever the line is
 * already drawn from: a dash for a border, a space for a row of content.
 *
 * @param {string} line
 * @param {number} target
 * @returns {string}
 */
function padFrameLine(line, target) {
  const trimmed = line.trimEnd();
  const missing = target - displayWidth(trimmed);

  if (missing <= 0) {
    return trimmed;
  }

  const characters = [...trimmed];
  const border = characters.pop();
  const previous = characters.at(-1);
  const fill = FILL_SET.has(previous) ? previous : " ";

  return characters.join("") + fill.repeat(missing) + border;
}

/**
 * Make every box in a block of text rectangular.
 *
 * @param {string} text
 * @returns {string} the text with short frame lines padded
 */
export function alignAsciiBoxes(text) {
  if (typeof text !== "string" || text.length === 0) {
    return text;
  }

  const lines = text.split("\n");
  const boxes = findBoxes(lines);

  if (boxes.length === 0) {
    return text;
  }

  for (const { start, end } of boxes) {
    const target = Math.max(...lines.slice(start, end + 1).map((line) => displayWidth(line.trimEnd())));

    for (let index = start; index <= end; index += 1) {
      lines[index] = padFrameLine(lines[index], target);
    }
  }

  return lines.join("\n");
}

/**
 * Report the frame lines that do not reach their box's right edge, plus any
 * box that opens and never closes.
 *
 * @param {string} text
 * @returns {Array<{ line: number, width: number, expected: number, reason: string }>}
 */
export function findRaggedBoxes(text) {
  if (typeof text !== "string" || text.length === 0) {
    return [];
  }

  const lines = text.split("\n");
  const found = [];

  for (const { start, end } of findBoxes(lines)) {
    const widths = lines.slice(start, end + 1).map((line) => displayWidth(line.trimEnd()));
    const expected = Math.max(...widths);

    for (const [offset, width] of widths.entries()) {
      if (width !== expected) {
        found.push({ line: start + offset + 1, width, expected, reason: "short of the right edge" });
      }
    }
  }

  const closed = new Set(findBoxes(lines).map((box) => box.start));

  for (const [index, line] of lines.entries()) {
    if (isFrameLine(line) && TOP_SET.has(openingCharacter(line)) && !closed.has(index)) {
      found.push({ line: index + 1, width: displayWidth(line.trimEnd()), expected: 0, reason: "box never closes" });
    }
  }

  return found.sort((a, b) => a.line - b.line);
}

/**
 * Align the boxes in an MCP tool result. Only prose text items are touched, and
 * a new object is returned so a cached core is never mutated.
 *
 * @param {{ content?: Array<{ type: string, text?: string }> }} result
 * @returns {object}
 */
export function alignAsciiBoxesResult(result) {
  if (!result || !Array.isArray(result.content)) {
    return result;
  }

  const content = result.content.map((item) =>
    item && item.type === "text" && typeof item.text === "string"
      ? { ...item, text: alignAsciiBoxes(item.text) }
      : item,
  );

  return { ...result, content };
}
