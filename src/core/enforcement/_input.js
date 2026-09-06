/** @module core/enforcement/input - argument limits, prototype-pollution guard, normalization */

export const MAX_ARGUMENT_BYTES = 256 * 1024;
/** Hard cap on a tool result before it leaves the server. */
export const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_DEPTH = 12;
const MAX_KEYS = 1000;
const NORMALIZED_FIELDS = new Set([
  "prompt",
  "query",
  "skill",
  "framework",
  "mode",
  "path",
  "title",
  "file",
  "fileName",
]);
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/** Reject prototype-pollution keys and enforce depth/key limits, recursively. */
export function assertSafeValue(value, state, depth = 0) {
  if (depth > MAX_DEPTH) {
    throw new Error(`argument nesting exceeds ${MAX_DEPTH}`);
  }

  if (typeof value === "string") {
    if (value.includes("\0")) {
      throw new Error("arguments contain NUL control characters");
    }

    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      assertSafeValue(item, state, depth + 1);
    }

    return;
  }

  const prototype = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("arguments must use plain objects");
  }

  for (const [key, child] of Object.entries(value)) {
    state.keys += 1;

    if (state.keys > MAX_KEYS) {
      throw new Error(`arguments exceed ${MAX_KEYS} keys`);
    }

    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`forbidden argument key: ${key}`);
    }

    assertSafeValue(child, state, depth + 1);
  }
}

/** Normalize the whitespace of the fields the cache keys on. */
export function normalizeArguments(arguments_) {
  const normalized = { ...arguments_ };

  for (const field of NORMALIZED_FIELDS) {
    if (typeof normalized[field] === "string") {
      normalized[field] = normalized[field].trim();
    }
  }

  return normalized;
}
