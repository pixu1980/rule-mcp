/** Formatting helpers: token estimate, value compression, context key priority. */

/**
 * Rough token estimation (English text, 1 token ≈ 4 chars).
 */
export function estimateTokens(text) {
  // For mixed text/code, ~4 chars per token is a reasonable heuristic
  return Math.ceil((text.length + text.split(/\s+/).length * 0.3) / 4);
}

/**
 * Compress a value: truncate long strings, deduplicate, etc.
 */
export function compressValue(v, maxLength = 80) {
  if (!v || v === "-") {
    return "-";
  }

  const string_ = String(v);

  if (string_.length <= maxLength) {
    return string_;
  }

  return string_.slice(0, maxLength - 3) + "...";
}

/**
 * Priority-scored entries. Higher = more important to keep.
 */
export function priorityScore(key) {
  if (/ADR|decision|arch/i.test(key)) {
    return 100;
  }

  if (/PROJECT_TYPE|STACK|BUILD/i.test(key)) {
    return 80;
  }

  if (/DOMAIN|ENTITY|PERSONA|FEATURE/i.test(key)) {
    return 60;
  }

  if (/VERSION|NODE|TYPESCRIPT/i.test(key)) {
    return 40;
  }

  if (/DESCRIPTION|NAME|PITCH/i.test(key)) {
    return 50;
  }

  if (/NOTES|CONSTRAINT|NEED/i.test(key)) {
    return 30;
  }

  return 10;
}
