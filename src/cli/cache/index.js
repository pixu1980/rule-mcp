

/**
 * @module cli/cache
 *
 * `rule-mcp cache <stats|export|verify|clear>`.
 *
 * Four read surfaces over the deterministic cache, and one of them is the
 * reason the others can be trusted: `verify` recomputes what is stored and says
 * what no longer reproduces. A deterministic cache whose determinism nobody
 * checks is an assumption.
 *
 * @see module:core/cache/catalog - promotion, the file format, and priming
 */

export * from "./_helpers.js";
export * from "./_stats.js";
export * from "./_export.js";
export * from "./_command.js";
