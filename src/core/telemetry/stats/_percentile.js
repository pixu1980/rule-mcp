/** @module core/telemetry/stats/percentile */

/**
 * Percentile over a sorted-in-place copy. Nearest-rank, which is the honest
 * choice on the small samples a single session produces.
 *
 * @param {number[]} values
 * @param {number} p - 0 to 1
 * @returns {number}
 */
export function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);

  return sorted[Math.max(0, index)];
}
