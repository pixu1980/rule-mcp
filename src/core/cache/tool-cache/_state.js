

/** Cache state: the entry store, the denylist and the normalizable fields. */
import { createMemoryStore } from "../../../shared/ports/index.js";

/**
 * Tools that must never be served from cache: they mutate the filesystem, read
 * mutable external state (git, cwd project), or embed non-deterministic values
 * (timestamps, receipts).
 */
export const NON_CACHEABLE = new Set([
  // mode=interview spawns a process and returns an ephemeral port: a replayed
  // result hands the user a dead URL and skips the spawn entirely.
  "rule_tool_architect",
  "rule_tool_apply",
  "rule_tool_fix",
  "rule_tool_process_adr",
  "rule_tool_process_handoff",
  // handon reads git: a replayed answer describes a repository that has moved.
  "rule_tool_process_handon",
  "rule_tool_gateway",
  "rule_tool_detect",
  "rule_tool_update",
  // plan reads the filesystem (.tokensave/ presence in projectDir): a replayed
  // answer states stale availability, and the fill itself is cheap string work.
  "rule_tool_plan",
]);

/**
 * The (tool, field) pairs whose value may be canonicalized into a key.
 *
 * An explicit allowlist, and it has one entry, which is the finding rather than
 * a shortcut. A field is only safe to normalize if its raw value cannot reach
 * the output: replaying a stored answer for a rephrased question is correct
 * only when the answer does not quote the question.
 *
 * Measured against the live tools rather than assumed. `pix_tool` scores a
 * prompt and returns a route, and the prompt appears nowhere in the result. A
 * skill tool in `mode=search` and `rule_tool_search` both echo the query verbatim
 * in their heading, so a normalized replay would hand back a header for a
 * question nobody asked. `rule_tool_check` takes code, which is content and not a
 * question at all.
 *
 * `mode=tldr` does not echo its query and is the obvious next candidate, but it
 * selects sections through BM25 and whether a deduplicated, sorted query scores
 * identically is a claim that needs its own test. It is not in yet.
 *
 * @see test/cache-tiers.test.mjs - the echo checks that justify each entry
 */
export const NORMALIZABLE = new Map([["pix_tool", new Set(["prompt"])]]);

/** Max in-memory entries before oldest-first eviction. */
export const MAX_MEMORY_ENTRIES = 500;

/**
 * The entries, behind the store port.
 *
 * The default is a store with no file, and the persistence module replaces it
 * with the file-backed one on the first cache touch. Everything about holding
 * entries - the memory tier, the durability, the debounce - belongs to the
 * store; what is left here is what a cache entry is allowed to be.
 *
 * @type {import("../../../shared/ports/index.js").StorePort}
 */
export const cacheState = {
  store: createMemoryStore(),
};
