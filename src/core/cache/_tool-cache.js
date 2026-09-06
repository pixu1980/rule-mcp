/**
 * @module core/cache/tool-cache
 *
 * Deterministic tool-result cache. This server never calls an LLM, every tool
 * output is a pure function of (tool name, arguments, on-disk skills). So identical
 * calls can replay a stored result instead of recomputing, and NEVER need to
 * consult the model. That is the "recycle" mechanism: same question in -> same
 * answer out, served from cache.
 *
 * Two tiers:
 *   - in-memory Map (fast, bounded) for the current process
 *   - persistent, ultra-compressed (gzip) file in stateDir so recycling survives
 *     restarts
 *
 * Only READ-ONLY tools are cached. Mutation / non-deterministic tools (they write
 * files, read git/FS state, or stamp timestamps) are on a denylist and always run
 * live. Errors are never cached.
 *
 * Opt out entirely with RULE_MCP_NO_CACHE=1.
 *
 * @see module:tools/router, callTool consults this cache
 */

import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { canonicalizeQuery } from "../bm25/index.js";
import { codeSignature } from "../code-signature.js";

export { codeSignature } from "../code-signature.js";
import { pkg as package_, getRuntimePaths, getSkillsDirs as getSkillsDirectories } from "../../cli/paths.js";

/**
 * Tools that must never be served from cache: they mutate the filesystem, read
 * mutable external state (git, cwd project), or embed non-deterministic values
 * (timestamps, receipts).
 */
const NON_CACHEABLE = new Set([
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
const NORMALIZABLE = new Map([["pix_tool", new Set(["prompt"])]]);

/** Max in-memory entries before oldest-first eviction. */
const MAX_MEMORY_ENTRIES = 500;

/** In-memory tier: key -> result object. */
const _memory = new Map();

/** Whether the persistent tier has been loaded this process. */
let _isLoaded = false;
/** Whether the persistent tier has unsaved changes. */
let _isDirty = false;
/** Debounce timer for persistent flushes. */
let _flushTimer = null;

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
function cacheFile() {
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
function namespace() {
  return `${package_.version}-${codeSignature()}`;
}

/** Content digests of the skills, computed once per process. */
const _digests = new Map();
let _digestsLoaded = false;

/**
 * The content digest of one skill.
 *
 * Lives here rather than in `core/skills.js` because `skills.js` imports the
 * router and the router imports this file: putting it there would close a
 * cycle. The only consumer is invalidation, so this is where it belongs anyway.
 *
 * @param {string} name a `rule-*` directory name
 * @returns {string|undefined} 16 hex characters, or undefined if there is no such skill
 */
export function skillDigest(name) {
  if (!_digestsLoaded) {
    _digestsLoaded = true;
    try {
      const { embeddedSkills } = getSkillsDirectories();

      for (const entry of readdirSync(embeddedSkills, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith("rule-")) {
          continue;
        }

        try {
          const content = readFileSync(join(embeddedSkills, entry.name, "SKILL.md"));
          _digests.set(entry.name, createHash("sha256").update(content).digest("hex").slice(0, 16));
        } catch {
          /* a skill without a readable SKILL.md is not a dependency */
        }
      }
    } catch {
      /* no skills directory: every entry will be unverifiable */
    }
  }

  return _digests.get(name);
}

/** Drop the memoized digests, so a skills reload is seen. */
export function clearSkillDigests() {
  _digests.clear();
  _digestsLoaded = false;
}

/**
 * Are every one of an entry's recorded dependencies still as they were?
 *
 * An unresolvable dependency counts as changed. A skill that was deleted cannot
 * be shown to be unchanged, and unverifiable is not the same as valid.
 *
 * @param {object|undefined} deps name -> digest, as recorded at store time
 * @returns {boolean}
 */
function dependenciesHold(deps) {
  for (const [name, digest] of Object.entries(deps ?? {})) {
    if (skillDigest(name) !== digest) {
      return false;
    }
  }

  return true;
}

/** Stable stringify (sorted keys) so argument order never changes the key. */
function stableStringify(value) {
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
 * @param {string} toolName
 * @param {object} args
 * @returns {string|null}
 */
export function cacheKey(toolName, args) {
  if (NON_CACHEABLE.has(toolName)) {
    return null;
  }

  const payload = `${namespace()}\u0000${toolName}\u0000${stableStringify(args ?? {})}`;

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
  const payload = `${namespace()} n1 ${toolName} ${stableStringify(normalized)}`;

  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Look a call up across the tiers, cheapest first, and say which one answered.
 *
 * @param {string} toolName
 * @param {object} args
 * @returns {{ result: object, tier: "exact"|"normalized" }|undefined}
 */
export function cacheLookup(toolName, args) {
  if (!cacheEnabled()) {
    return;
  }

  const exactKey = cacheKey(toolName, args);
  const exact = cacheGet(exactKey);

  if (exact) {
    backfillCall(exactKey, toolName, args);

    return { result: exact, tier: "exact" };
  }

  const normalizedK = normalizedKey(toolName, args);
  const normalized = cacheGet(normalizedK);

  if (normalized) {
    backfillCall(normalizedK, toolName, args);

    return { result: normalized, tier: "normalized" };
  }
}

/**
 * Teach an older entry which call produced it.
 *
 * Entries written before the format recorded the call cannot be verified or
 * promoted, and a hit never rewrites an entry, so without this they would carry
 * that gap until eviction. A reuse is the one moment the call is known again,
 * so it is filled in there and the entry joins the rest.
 *
 * @param {string} key
 * @param {string} toolName
 * @param {object} args
 */
function backfillCall(key, toolName, args) {
  const entry = _memory.get(key);

  if (!entry || entry.tool !== undefined) {
    return;
  }

  entry.tool = toolName;
  entry.args = structuredClone(args ?? {});
  _isDirty = true;
}

/** The text of a result, for the echo check. */
function resultText(result) {
  return (result?.content ?? [])
    .map((item) => item?.text ?? "")
    .join("\n")
    .toLowerCase();
}

/**
 * Does this result quote the question it was asked?
 *
 * The allowlist is necessary and not sufficient. `pix_tool` does not echo the
 * prompt when it routes confidently, and DOES echo it when it cannot: the
 * uncertain answer carries `No strong match for "<prompt>"`. Replaying that for
 * a differently worded question would hand the caller a sentence about a prompt
 * nobody typed - and the uncertain answer is precisely the one least worth
 * replaying.
 *
 * So the tier is decided per call, on the output, not per tool. A future tool
 * that starts quoting its input stops getting L1 entries without anyone
 * remembering to check.
 *
 * @param {string} toolName @param {object} args @param {object} result
 * @returns {boolean}
 */
function echoesArguments(toolName, args, result) {
  const fields = NORMALIZABLE.get(toolName);

  if (!fields) {
    return false;
  }

  const text = resultText(result);

  for (const field of fields) {
    const raw = args?.[field];

    if (typeof raw !== "string" || raw.trim().length === 0) {
      continue;
    }

    if (text.includes(raw.trim().toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Store a result under every key that can retrieve it.
 *
 * Both tiers get the same object, so an L1 hit and an L0 hit are the same answer
 * by construction rather than by agreement. L1 is skipped when the answer quotes
 * the question - see echoesArguments.
 *
 * @param {string} toolName
 * @param {object} args
 * @param {object} result
 * @param {object} [deps] skill name -> digest, from dependenciesOf()
 */
export function cacheStore(toolName, args, result, deps = {}) {
  const call = { tool: toolName, args };
  cacheSet(cacheKey(toolName, args), result, deps, call);

  if (!echoesArguments(toolName, args, result)) {
    cacheSet(normalizedKey(toolName, args), result, deps, call);
  }
}

/** Lazily load the persistent tier into memory (once per process). */
function ensureLoaded() {
  if (_isLoaded) {
    return;
  }

  _isLoaded = true;
  try {
    const file = cacheFile();

    if (!existsSync(file)) {
      return;
    }

    const parsed = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8"));

    if (parsed?.namespace === namespace() && parsed?.entries && typeof parsed.entries === "object") {
      for (const [k, v] of Object.entries(parsed.entries)) {
        // A file written before entries carried their dependencies stored the
        // result at the top level. Skipping those is cheaper and safer than
        // guessing what they depended on, and they are recomputed once.
        if (!v || typeof v !== "object" || !v.result) {
          continue;
        }
        // A core carrying a request id can never match a recompute, so it
        // would be reported as drift on every verify. Dropping it keeps the
        // cache converging without anyone clearing it (ADR 062).
        if (v.result?._meta?.pixEnforcement?.requestId !== undefined) {
          continue;
        }

        _memory.set(k, v);
      }
    }
    // A namespace mismatch means the on-disk cache is stale, ignore it; the next
    // flush overwrites the file with the current namespace.
  } catch {
    /* corrupt/unreadable cache is non-fatal, start empty */
  }
}

/** Schedule a debounced persistent flush (unref'd so it never holds the event loop). */
function scheduleFlush() {
  _isDirty = true;

  if (_flushTimer) {
    return;
  }

  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    flush();
  }, 2000);
  _flushTimer.unref?.();
}

/** Write the in-memory tier to the gzipped persistent file (atomic rename). */
export function flush() {
  if (!_isDirty) {
    return;
  }

  _isDirty = false;
  try {
    const { stateDir } = getRuntimePaths();
    mkdirSync(stateDir, { recursive: true, mode: 0o700 });
    const entries = Object.fromEntries(_memory);
    const payload = gzipSync(Buffer.from(JSON.stringify({ namespace: namespace(), version: 3, entries }), "utf8"), {
      level: 9,
    });
    const temporary = `${cacheFile()}.${process.pid}.tmp`;
    writeFileSync(temporary, payload, { mode: 0o600 });
    renameSync(temporary, cacheFile());
  } catch {
    /* best-effort persistence */
  }
}

/**
 * Look up a cached result.
 *
 * @param {string} key, from cacheKey()
 * @returns {object|undefined} the stored result, or undefined on miss
 */
export function cacheGet(key) {
  if (!key || !cacheEnabled()) {
    return;
  }

  ensureLoaded();
  const hit = _memory.get(key);

  if (hit === undefined) {
    return;
  }
  // Freshness is per entry, not per namespace: an entry whose skills have moved
  // is evicted on the read that found it, so a stale answer is never served and
  // the space it held is not held twice.
  if (!dependenciesHold(hit.deps)) {
    _memory.delete(key);
    _isDirty = true;

    return;
  }
  // Promote to MRU, and count the reuse: promotion to the catalog is earned by
  // being used, and a counter kept anywhere else would have to be kept in step.
  hit.hits = (hit.hits ?? 0) + 1;
  _isDirty = true;
  _memory.delete(key);
  _memory.set(key, hit);
  // Return a deep copy so callers can't mutate the cached object.

  return structuredClone(hit.result);
}

/**
 * Store a result. No-ops for non-cacheable keys, disabled cache, or error results.
 *
 * @param {string} key, from cacheKey()
 * @param {object} result, the final MCP tool result
 * @param {object} [deps] skill name -> digest at store time, from dependenciesOf()
 */
export function cacheSet(key, result, deps = {}, call = {}) {
  if (!key || !cacheEnabled()) {
    return;
  }

  if (!result || result.isError) {
    return;
  }

  ensureLoaded();
  _memory.set(key, {
    result: structuredClone(result),
    deps: { ...deps },
    // The call that produced this, so `cache verify` and `cache export` can run
    // it again. A hash cannot be re-run, and an entry nobody can re-run is one
    // whose determinism is an assumption rather than a check.
    ...(call.tool !== undefined && { tool: call.tool, args: structuredClone(call.args ?? {}) }),
    hits: 0,
  });
  if (_memory.size > MAX_MEMORY_ENTRIES) {
    const oldest = _memory.keys().next().value;

    if (oldest !== undefined) {
      _memory.delete(oldest);
    }
  }

  scheduleFlush();
}

/**
 * Whether a stored answer is still fresh, without counting a reuse.
 *
 * `cache verify` needs this: reading through `cacheLookup` would count a hit
 * for every entry it checked, and an entry could be promoted to the shared
 * catalog by having been verified rather than by having been used. A tool that
 * changes what it measures is not a measurement.
 *
 * @param {string} toolName
 * @param {object} args
 * @returns {boolean} false when nothing is stored, or what is stored is stale
 */
export function cacheIsFresh(toolName, args) {
  if (!cacheEnabled()) {
    return false;
  }

  ensureLoaded();

  for (const key of [cacheKey(toolName, args), normalizedKey(toolName, args)]) {
    const entry = key ? _memory.get(key) : undefined;

    if (entry && dependenciesHold(entry.deps)) {
      return true;
    }
  }

  return false;
}

/**
 * Reuses an entry needs before it is a candidate for the shared catalog.
 *
 * Three, because once is an accident and twice is a coincidence. The number is
 * here rather than in the catalog module because the counter lives here.
 */
export const MIN_HITS = 3;

/**
 * Store a result only if nothing is stored under that key yet.
 *
 * This is how an inherited answer enters: the catalog is a floor of shared
 * results, never an override of what this machine computed. Priming happens
 * once at startup, before any work, so "already stored" means a local entry
 * that survived from a previous run.
 *
 * @param {string} toolName
 * @param {object} args
 * @param {object} result
 * @param {object} [deps]
 * @returns {boolean} whether it was stored
 */
export function cachePrime(toolName, args, result, deps = {}) {
  if (!cacheEnabled()) {
    return false;
  }

  const key = cacheKey(toolName, args);

  if (!key) {
    return false;
  }

  ensureLoaded();

  if (_memory.has(key)) {
    return false;
  }

  cacheSet(key, result, deps, { tool: toolName, args });

  return true;
}

/**
 * The entries reused often enough to be worth sharing, one per distinct call.
 *
 * An entry is stored under two keys, so the same call appears twice with the
 * hits split between the tier that answered it. They are merged here: the call
 * is what is promoted, not the key.
 *
 * @param {number} [minHits]
 * @returns {Array<{ tool: string, args: object, result: object, deps: object, hits: number }>}
 */
export function promotableEntries(minHits = MIN_HITS) {
  const byCall = new Map();

  for (const entry of cacheEntries()) {
    if (entry.tool === undefined) {
      continue;
    }

    const identity = `${entry.tool}\u0000${stableStringify(entry.args ?? {})}`;
    const merged = byCall.get(identity);

    if (merged) {
      merged.hits += entry.hits;
    } else {
      byCall.set(identity, { ...entry, hits: entry.hits });
    }
  }

  return [...byCall.values()].filter((entry) => entry.hits >= minHits);
}

/** Clear both tiers. */
export function cacheClear() {
  _memory.clear();
  _isDirty = true;
  flush();
}

/** @returns {number} Entries held in the in-memory tier. */
export function memoryEntryCount() {
  return _memory.size;
}

/**
 * Hand the in-memory tier back to the heap without losing a single entry.
 *
 * The persistent tier is written first, then memory is emptied and marked
 * unloaded, so the next lookup reads the file back instead of recomputing. The
 * difference from cacheClear() is the whole point: that one forgets, this one
 * only stops holding.
 *
 * @returns {number} How many entries were released
 */
export function releaseMemory() {
  flush();
  const released = _memory.size;

  _memory.clear();
  _isDirty = false;
  _isLoaded = false;

  return released;
}

/**
 * The stored entries, for the report and the tests.
 *
 * Read-only by construction: a deep copy, and no key, because a key is a hash
 * and tells a reader nothing they can act on.
 *
 * @returns {Array<{ deps: object, tokens: number }>}
 */
export function cacheEntries() {
  ensureLoaded();

  return [..._memory.values()].map((entry) => ({
    tool: entry.tool,
    args: entry.args === undefined ? undefined : structuredClone(entry.args),
    result: structuredClone(entry.result),
    deps: { ...entry.deps },
    hits: entry.hits ?? 0,
    tokens: Math.ceil(JSON.stringify(entry.result ?? {}).length / 4),
  }));
}

/** Flush pending writes on process exit so recycling survives restarts. */
process.on("exit", () => {
  try {
    flush();
  } catch {
    /* ignore */
  }
});
