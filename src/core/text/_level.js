

/**
 * @module core/text/level
 *
 * The compression intensity levels and where the running level comes from.
 *
 * `RULE_MCP_COMPRESSION_LEVEL` picks one of `off`, `lite`, `full`, `ultra`
 * (default `full`); `RULE_MCP_NO_COMPRESSION=1` is the historical opt-out
 * and aliases `off`. The value is parsed once per distinct environment rather
 * than once per line, and an unknown value warns once instead of silently
 * turning compression off.
 *
 * Which rule table each level owns is documented in `docs/05-env-variables.md`
 * and enforced by the `level` tag on every vocabulary entry.
 */

/** The intensity levels, weakest first. */
export const LEVELS = ["off", "lite", "full", "ultra"];

/** The level used when nothing asks for another one. */
export const DEFAULT_LEVEL = "full";

/**
 * Is `level` at least `minimum`?
 *
 * @param {string} level
 * @param {string} minimum
 * @returns {boolean}
 */
export function atLeast(level, minimum) {
  return LEVELS.indexOf(level) >= LEVELS.indexOf(minimum);
}

let resolved = { raw: null, off: null, level: DEFAULT_LEVEL };
let warned = false;

/**
 * The level in force.
 *
 * @returns {"off"|"lite"|"full"|"ultra"}
 */
export function compressionLevel() {
  const raw = process.env.RULE_MCP_COMPRESSION_LEVEL;
  const off = process.env.RULE_MCP_NO_COMPRESSION === "1";

  if (resolved.raw === raw && resolved.off === off) {
    return resolved.level;
  }

  let level = DEFAULT_LEVEL;

  if (off) {
    level = "off";
  } else if (typeof raw === "string" && raw.trim() !== "") {
    const wanted = raw.trim().toLowerCase();

    if (LEVELS.includes(wanted)) {
      level = wanted;
    } else if (!warned) {
      warned = true;
      process.stderr.write(`rule-mcp: unknown RULE_MCP_COMPRESSION_LEVEL "${raw}", using "${DEFAULT_LEVEL}"\n`);
    }
  }

  resolved = { raw, off, level };

  return level;
}

/** @returns {boolean} */
export function compressionEnabled() {
  return compressionLevel() !== "off";
}
