/**
 * @module core/cache-catalog
 *
 * The shared half of the cache.
 *
 * `tool-cache.json.gz` is private to one machine: everything, hot, evicted
 * freely. `rule-mcp-catalog.json` is the part a team inherits: promoted entries,
 * readable, sorted, and committed to the repository on purpose. Conflating the
 * two is what turns a catalog into a dump, so they are separate files with
 * separate rules.
 *
 * An entry earns its place twice. It has to have been reused (MIN_HITS), and it
 * has to still reproduce: every candidate is recomputed at export time and
 * dropped if the answer has moved. An entry that no longer reproduces was
 * already wrong here, and exporting it would spread it.
 *
 * The machine proposes and a person decides: `cache export` writes the file and
 * somebody commits it.
 *
 * @see module:core/tool-cache - the private tier, and where hits are counted
 */

export { MIN_HITS } from "../tool-cache/index.js";
export * from "./_io.js";
export * from "./_build.js";
export * from "./_prime.js";
