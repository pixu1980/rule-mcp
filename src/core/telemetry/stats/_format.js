/** @module core/telemetry/stats/format - shared formatting helpers for the read surfaces */

/** @param {number} n @returns {string} */
export const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

/** @param {object} counts @param {number} limit @returns {string[]} */
export function top(counts, limit) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => `  ${String(count).padStart(5)}  ${name}`);
}

/** @param {number} n @param {number} [digits] @returns {string} */
export const pct = (n, digits = 1) => `${((Number(n) || 0) * 100).toFixed(digits)}%`;

/** @param {number} n @returns {string} thousands separated, so long numbers stay readable */
export const num = (n) => (Number(n) || 0).toLocaleString("en-US");

/** @param {number} n @returns {string} */
export const usd = (n) => `$${(Number(n) || 0).toFixed(4)}`;

/** @param {number} bytes @returns {string} */
export const kb = (bytes) => `${Math.round((Number(bytes) || 0) / 1024)} KB`;

/** @param {number} ms @returns {string} mm:ss, which is how a session length is read */
export function clock(ms) {
  const seconds = Math.round((Number(ms) || 0) / 1000);

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * A two-column table of label and value. Markdown, because both read surfaces
 * that show this - a terminal and a tool result - render it acceptably.
 *
 * @param {Array<[string, string]>} rows
 * @returns {string[]}
 */
export function table(rows) {
  const kept = rows.filter(([, value]) => value !== undefined && value !== "");

  return kept.length === 0 ? [] : ["| Metric | Value |", "|---|---:|", ...kept.map(([k, v]) => `| ${k} | ${v} |`), ""];
}

/** @param {object} counts @param {number} limit @returns {string[]} */
export function countTable(counts, limit) {
  const rows = Object.entries(counts ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  return rows.length === 0 ? [] : ["| Name | Count |", "|---|---:|", ...rows.map(([k, v]) => `| ${k} | ${v} |`), ""];
}
