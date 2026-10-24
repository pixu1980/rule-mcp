/**
 * @module scripts/reports/census/_format
 *
 * Markdown primitives the census sections share.
 *
 * Column widths are not padded here. The generator hands its output to
 * prettier, which owns the final bytes of every census document, so padding a
 * cell twice would only make the two disagree.
 */

/** A markdown table cell cannot carry a raw pipe or a newline. */
export const cell = (value) =>
  String(value ?? "")
    .replaceAll("|", String.raw`\|`)
    .replaceAll(/\s*\n\s*/g, " ")
    .trim();

/**
 * One markdown table.
 *
 * @param {string[]} columns
 * @param {Array<Array<string>>} rows
 * @returns {string[]}
 */
export const table = (columns, rows) => [
  `| ${columns.join(" | ")} |`,
  `| ${columns.map(() => "---").join(" | ")} |`,
  ...rows.map((row) => `| ${row.map((value) => cell(value)).join(" | ")} |`),
];

/** First sentence of a description, so a table row stays one line. */
export const firstSentence = (text) => {
  const clean = cell(text);
  const stop = clean.search(/\.\s|\.$/);

  return stop === -1 ? clean : clean.slice(0, stop + 1);
};

/** The area a `rule-mcp-<area>-<topic>` skill belongs to. */
export const areaOf = (name) => {
  const parts = name.split("-");

  return parts.length > 1 ? parts[1] : name;
};

/** The MCP tool a catalog skill directory mints: `rule-mcp-frontend-react` -> `rule_tool_frontend_react`. */
export const toolOf = (name) => (name === "rule-mcp" ? "rule_tool" : `rule_tool_${name.slice("rule-mcp-".length).replaceAll("-", "_")}`);
