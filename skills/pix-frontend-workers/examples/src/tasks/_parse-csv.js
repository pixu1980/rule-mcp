/**
 * @module tasks/parse-csv
 *
 * Representative CPU-bound task: synchronous, allocation-heavy, no DOM.
 *
 * It is a plain exported function, so the unit test imports it directly and
 * runs it on the main thread. Nothing here knows it lives in a worker - that
 * is the point.
 */

/**
 * Parse delimited text into row objects keyed by the header line.
 *
 * @param {{ text: string, delimiter?: string }} input
 * @returns {Array<Record<string, string>>}
 */
export function parseCsv(input) {
  const { text, delimiter = "," } = input;
  const lines = text.split("\n").filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].split(delimiter).map((header) => header.trim());
  const rows = [];

  for (const line of lines.slice(1)) {
    const cells = line.split(delimiter);
    const row = {};

    for (const [index, header] of headers.entries()) {
      row[header] = (cells[index] ?? "").trim();
    }

    rows.push(row);
  }

  return rows;
}
