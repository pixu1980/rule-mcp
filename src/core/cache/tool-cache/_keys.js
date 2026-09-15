

/** Cache keys: stable stringify, the exact key and the normalized (L1) key. */
import { createHash } from "node:crypto";
import { canonicalizeQuery } from "../../bm25/index.js";
import { NON_CACHEABLE, NORMALIZABLE } from "./_state.js";
import { namespace, normalizedTierEnabled } from "./_config.js";
import { compressionLevel } from "../../text/_level.js";

/** Stable stringify (sorted keys) so argument order never changes the key. */
export function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const keys = Object.keys(value).sort();

  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

/**
 * Compute the cache key for a tool call, or null if the tool is not cacheable.
 *
 * The compression level is part of the key. Most cores are computed before
 * compression and would be safe to share across levels, but `rule_tool_compress`
 * IS the compressor: its core is the compressed text, so replaying it under a
 * different level would hand back another level's output. Keying on the level
 * makes that impossible to get wrong, and a level change is an env change -
 * rare enough that recomputing is cheaper than a per-tool dependency list.
 *
 * @param {string} toolName
 * @param {object} args
 * @returns {string|null}
 */
export function cacheKey(toolName, args) {
  if (NON_CACHEABLE.has(toolName)) {
    return null;
  }

  const payload = `${namespace()}\u0000${compressionLevel()}\u0000${toolName}\u0000${stableStringify(args ?? {})}`;

  return createHash("sha256").update(payload).digest("hex");
}

/**
 * The L1 key: the same call with its prompt-shaped arguments canonicalized.
 *
 * Returns null when the tool is not cacheable, has no normalizable field, or
 * the field canonicalizes to nothing. A null means "L1 does not apply here",
 * never "L1 failed".
 *
 * @param {string} toolName
 * @param {object} args
 * @returns {string|null}
 */
export function normalizedKey(toolName, args) {
  if (NON_CACHEABLE.has(toolName) || !normalizedTierEnabled()) {
    return null;
  }

  const fields = NORMALIZABLE.get(toolName);

  if (!fields) {
    return null;
  }

  const normalized = { ...args };
  let changed = false;

  for (const field of fields) {
    if (typeof normalized[field] !== "string") {
      continue;
    }

    const canonical = canonicalizeQuery(normalized[field]);

    if (canonical === "") {
      return null;
    }

    normalized[field] = canonical;
    changed = true;
  }

  if (!changed) {
    return null;
  }

  // "n1" separates this key space from L0's, so a canonical form can never
  // collide with a raw one that happens to stringify the same way.
  const payload = `${namespace()} n1 ${compressionLevel()} ${toolName} ${stableStringify(normalized)}`;

  return createHash("sha256").update(payload).digest("hex");
}
