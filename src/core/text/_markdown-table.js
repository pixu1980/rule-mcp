

/**
 * @module core/text/markdown-table
 *
 * Render a markdown table exactly as prettier 3.x does: every cell padded to
 * the column width (longest cell), separators of dashes two wider than the
 * column.
 *
 * The generated indexes (`docs/adr/ADR.md`, `docs/handoff/HANDOFF.md`) must
 * satisfy two gates at once - a byte-equal regeneration test and
 * `prettier --check` - so the generator is the prettier formatter for tables
 * instead of the two fighting over the committed file.
 */

/**
 * @param {string[]} headers
 * @param {string[][]} rows
 * @returns {string[]} table lines, no trailing blank line
 */
export function renderTable(headers, rows) {
  const all = [headers, ...rows];
  const widths = headers.map((_, col) => Math.max(...all.map((row) => String(row[col]).length)));
  const cell = (text, width) => ` ${String(text).padEnd(width)} `;
  const line = (row) => `|${row.map((text, col) => cell(text, widths[col])).join("|")}|`;
  const separator = `|${widths.map((width) => cell("-".repeat(width), width)).join("|")}|`;

  return [line(headers), separator, ...rows.map(line)];
}
