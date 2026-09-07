/** Cache switches and locations: enable flags, the persistent file, the namespace fingerprint. */
import { join } from "node:path";
import { codeSignature } from "../../index.js";
import { pkg as package_, getRuntimePaths } from "../../../cli/paths/index.js";

/** @returns {boolean} */
export function cacheEnabled() {
  return process.env.RULE_MCP_NO_CACHE !== "1";
}

/**
 * Whether the tiers above the exact key are allowed.
 *
 * Off means L0 only. Two uses: a caller who wants replay to require a
 * byte-identical call, and the before number in `scripts/cache-report.mjs` -
 * measuring an improvement needs a switch, not a simulation of one.
 *
 * @returns {boolean}
 */
export function normalizedTierEnabled() {
  return process.env.RULE_MCP_CACHE_EXACT_ONLY !== "1";
}

/** @returns {string} Path of the gzipped persistent cache file. */
export function cacheFile() {
  return join(getRuntimePaths().stateDir, "tool-cache.json.gz");
}

/**
 * Namespace fingerprint: the server version, and nothing else.
 *
 * It carries no skill mtime: that would drop every entry for every skill when
 * one heading changes, which on a repository whose sessions mostly edit skills
 * leaves the cache ornamental. Skill freshness is checked per entry against the
 * digests it recorded (ADR 054), so the namespace is
 * back to what it can honestly claim: a server upgrade may change output shape
 * for reasons no content digest captures.
 *
 * @returns {string}
 */
export function namespace() {
  return `${package_.version}-${codeSignature()}`;
}
