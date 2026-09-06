/** @module core/text/ascii-box/align - pad every frame line of a box to one width */

import { FILL_SET, findBoxes, isFrameLine, openingCharacter, TOP_SET } from "./_frames.js";
import { displayWidth } from "./_width.js";

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
