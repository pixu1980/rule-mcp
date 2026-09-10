

/** @module core/review/docs/table - the markdown-table plumbing the trio shares */

/** The columns of the review table, in the order they are written and read. */
export const REVIEW_COLUMNS = ["Finding", "Severity", "Status", "Evidence", "Summary"];

/** A pipe would end the cell it sits in, so it travels escaped. */
export function escapeCell(value) {
  return String(value ?? "")
    .replaceAll("\\", String.raw`\\`)
    .replaceAll("|", String.raw`\|`)
    .replaceAll(/\r?\n/g, " ")
    .trim();
}

/** The inverse of {@link escapeCell}. */
function unescapeCell(value) {
  return value
    .replaceAll(String.raw`\|`, "|")
    .replaceAll("\\\\", "\\")
    .trim();
}

/**
 * Split one markdown table row into its cells, respecting escaped pipes.
 *
 * @param {string} line
 * @returns {string[]}
 */
export function splitRow(line) {
  const cells = [];
  let current = "";
  let index = 0;

  const body = line.trim().replace(/^\|/, "").replace(/\|$/, "");

  while (index < body.length) {
    const char = body[index];

    if (char === "\\" && index + 1 < body.length) {
      current += char + body[index + 1];
      index += 2;
      continue;
    }

    if (char === "|") {
      cells.push(current);
      current = "";
      index += 1;
      continue;
    }

    current += char;
    index += 1;
  }

  cells.push(current);

  return cells.map((cell) => unescapeCell(cell));
}

/**
 * One markdown table, header row included, columns padded Prettier-style.
 *
 * Cells are escaped first and padded after, so {@link escapeCell} stays
 * unaware of the padding and the reader keeps trimming it back off.
 */
export function table(columns, rows) {
  const escaped = [columns, ...rows].map((row) => row.map((cell) => escapeCell(cell)));
  const widths = columns.map((_, index) => Math.max(3, ...escaped.map((row) => (row[index] ?? "").length)));
  const line = (cells, fill) => `| ${cells.map((cell, index) => cell.padEnd(widths[index], fill)).join(" | ")} |`;

  return [
    line(escaped[0], " "),
    line(
      widths.map((width) => "-".repeat(width)),
      "-",
    ),
    ...escaped.slice(1).map((row) => line(row, " ")),
  ];
}
