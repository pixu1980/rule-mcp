/**
 * @module core/reclaim
 *
 * What an idle server gives back.
 *
 * A long-lived daemon fills its heap with things that are cheap to rebuild: the
 * BM25 index over every skill (the section text, twice - once tokenized, once
 * verbatim), the LRU of SKILL.md bodies, and the in-memory tier of the result
 * cache. All three are worth their space while calls are arriving, and none of
 * them is worth ~100 MB of resident memory for an editor window somebody left
 * open overnight.
 *
 * So they are dropped after a spell of silence, and each one is picked because
 * it comes back on demand: the index rebuilds on the next search, the skill LRU
 * is read-through, and the result cache is flushed to disk before its memory
 * tier is emptied, so the next lookup reloads it rather than recomputing.
 * Reclaiming costs the first call after an idle period some milliseconds; it
 * costs correctness nothing.
 *
 * The timer is unref'd, and reclaim is skipped entirely while the process is
 * being used, so this can only ever run in the gap where nothing else is.
 *
 * @see module:core/bm25, module:core/skills, module:core/cache/tool-cache - the three heaps
 * @see module:tools/router - marks activity on every tool call
 */

import { clearIndex, isIndexReady } from "../bm25/index.js";
import { skillCache } from "../skills/_skills.js";
import { flush, memoryEntryCount, releaseMemory } from "../cache/tool-cache/index.js";

/** Silence after which the rebuildable heaps are dropped. */
export const IDLE_RECLAIM_MS = 600_000;

/** How often idleness is checked. */
export const RECLAIM_CHECK_MS = 60_000;

/** Last time a tool call passed through. */
let _lastActivity = Date.now();

/** True once an idle window has been reclaimed, until the next call arrives. */
let _reclaimed = false;

/** @type {NodeJS.Timeout|null} */
let _timer = null;

/**
 * Mark the server as in use. Called at the top of every tool call.
 *
 * @param {number} [now] - Injectable clock, for the tests
 */
export function touchActivity(now = Date.now()) {
  _lastActivity = now;
  _reclaimed = false;
}

/**
 * @param {number} [now]
 * @returns {number} Milliseconds since the last tool call
 */
export function idleFor(now = Date.now()) {
  return now - _lastActivity;
}

/**
 * Drop the rebuildable heaps if the server has been idle long enough.
 *
 * @param {{ now?: number, idleMs?: number }} [options]
 * @returns {{ index: boolean, skills: number, cacheEntries: number }|null} what
 *   was freed, or null when the server is busy or has nothing left to give
 */
export function reclaimIfIdle(options = {}) {
  const now = options.now ?? Date.now();
  const idleMs = options.idleMs ?? IDLE_RECLAIM_MS;

  if (_reclaimed || now - _lastActivity <= idleMs) {
    return null;
  }

  _reclaimed = true;

  return reclaimNow();
}

/**
 * Drop the rebuildable heaps now, regardless of idleness. Used by the idle
 * check and by the shutdown path, which flushes the cache on its way out.
 *
 * @returns {{ index: boolean, skills: number, cacheEntries: number }} what was freed
 */
export function reclaimNow() {
  const freed = { index: isIndexReady(), skills: skillCache.size, cacheEntries: memoryEntryCount() };

  clearIndex();
  skillCache.clear();
  releaseMemory();
  // Only a hint, and only when the process was started with --expose-gc:
  // dropping the references is the part that matters, returning the pages to
  // the OS is V8's call.
  globalThis.gc?.();

  return freed;
}

/**
 * Start the idle check. Unref'd, idempotent.
 *
 * @param {{ checkMs?: number, idleMs?: number }} [options]
 * @returns {NodeJS.Timeout}
 */
export function startIdleReclaim(options = {}) {
  if (_timer) {
    return _timer;
  }

  _timer = setInterval(() => {
    try {
      reclaimIfIdle({ idleMs: options.idleMs });
    } catch {
      /* housekeeping never breaks the server */
    }
  }, options.checkMs ?? RECLAIM_CHECK_MS);
  _timer.unref?.();

  return _timer;
}

/** Stop the idle check, flushing anything the cache still owes to disk. */
export function stopIdleReclaim() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }

  try {
    flush();
  } catch {
    /* best-effort persistence */
  }
}
