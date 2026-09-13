/** @module core/text/ascii-box/frames - the box-drawing character tables and box detection */

/** Opening corners. A box starts here. */
const TOP_LEFT = "┌╔┏╭";
/** Closing corners. A box at the same indentation ends here. */
const BOTTOM_LEFT = "└╚┗╰";
/** Everything that can begin or end a frame line. */
const FRAME = "│║┃┆┇┊┋┌┍┎┏┐┑┒┓└┕┖┗┘┙┚┛├┝┞┟┠┡┢┣┤┥┦┧┨┩┪┫┬┭┮┯┰┱┲┳┴┵┶┷┸┹┺┻┼╁╂╃╄╅╆╇╈╉╊╋╔╗╚╝╠╣╦╩╬╭╮╯╰";
/** Horizontal fills. Padding a border repeats the fill it is drawn from. */
const FILL = "─═━┄┅┈┉╌╍";

/** The frame characters as a set, for single-character membership tests. */
export const FRAME_SET = new Set(FRAME);
/** The fill characters as a set. */
export const FILL_SET = new Set(FILL);
/** The opening corners as a set. */
export const TOP_SET = new Set(TOP_LEFT);
/** The closing corners as a set. */
export const BOTTOM_SET = new Set(BOTTOM_LEFT);

/** @param {string} line @returns {string} the leading whitespace */
export function indentOf(line) {
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
export function isFrameLine(line) {
  const body = line.trim();

  if (body.length < 2) {
    return false;
  }

  const characters = [...body];

  return FRAME_SET.has(characters[0]) && FRAME_SET.has(characters.at(-1));
}

/** @param {string} line @returns {string} the first non-space character, or "" */
export function openingCharacter(line) {
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
export function findBoxes(lines) {
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
