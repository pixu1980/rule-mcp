/**
 * @module core/telemetry/token-stats
 *
 * Runtime accounting of the token-efficiency pipeline (caveman compression +
 * tokensave suppression + directives). Pure counters, zero dependencies.
 * Surfaced by `rule-mcp doctor` so the savings are measurable, not
 * anecdotal.
 */

const stats = {
  compressionCalls: 0,
  compressionBytesIn: 0,
  compressionBytesOut: 0,
  suppressedCalls: 0,
  suppressedBytesSaved: 0,
  directivesFull: 0,
  directivesTerse: 0,
};

/** Record one caveman compression pass. */
export function addCompression(bytesIn, bytesOut) {
  stats.compressionCalls += 1;
  stats.compressionBytesIn += bytesIn;
  stats.compressionBytesOut += bytesOut;
}

/** Record one tokensave suppression (bytesSaved = omitted bytes). */
export function addSuppression(bytesSaved) {
  stats.suppressedCalls += 1;
  stats.suppressedBytesSaved += bytesSaved;
}

/** Record a tokensave directive emission ("full" | "terse"). */
export function addDirective(kind) {
  if (kind === "terse") {
    stats.directivesTerse += 1;
  } else {
    stats.directivesFull += 1;
  }
}

/** Immutable snapshot plus derived totals. */
export function getTokenStats() {
  const compressionSaved = Math.max(0, stats.compressionBytesIn - stats.compressionBytesOut);

  return {
    ...stats,
    compressionSaved,
    bytesSavedTotal: compressionSaved + stats.suppressedBytesSaved,
  };
}

/** Reset all counters (tests). */
export function resetTokenStats() {
  for (const key of Object.keys(stats)) {
    stats[key] = 0;
  }
}
