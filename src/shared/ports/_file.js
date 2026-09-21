

/** @module shared/ports/file - a store that keeps its entries and writes them to a file */

import { readJson, writeJson } from "./_file-io.js";

/**
 * The memory tier is what the process reads; the file is what survives it. The
 * caller's `encode` and `decode` decide what the file means, so the IO, the gzip,
 * the atomic rename, the debounce and the write at exit are the store's own.
 *
 * @param {{
 *   file: string,
 *   encode: (entries: Iterable<[string, any]>) => object,
 *   decode: (parsed: object) => Iterable<[string, any]>,
 *   debounceMs?: number
 * }} options
 * @returns {StorePort & { persist: () => void, release: () => number, clear: () => void }}
 */
export function createFileStore({ file, encode, decode, debounceMs = 2000 }) {
  const held = new Map();
  let loaded = false;
  let dirty = false;
  let timer = null;

  /** Read the file into the memory tier, once per held set. */
  const load = () => {
    if (loaded) {
      return;
    }

    loaded = true;

    const parsed = readJson(file);

    if (parsed === undefined) {
      return;
    }

    for (const [key, value] of decode(parsed)) {
      held.set(key, value);
    }
  };

  /** Write the memory tier to the file, atomically, when anything changed. */
  const persist = () => {
    if (!dirty) {
      return;
    }

    dirty = false;
    writeJson(file, encode(held));
  };

  /** Mark the file stale and write it once the writes stop arriving. */
  const schedule = () => {
    dirty = true;

    if (timer) {
      return;
    }

    timer = setTimeout(() => {
      timer = null;
      persist();
    }, debounceMs);
    timer.unref?.();
  };

  // A store that writes to a file is the one that answers for what a restart
  // would lose, so it registers its own last write rather than trusting a
  // caller to do it on the way out.
  process.on("exit", () => {
    try {
      persist();
    } catch {
      /* ignore */
    }
  });

  return {
    get: (key) => {
      load();

      return held.get(key);
    },
    set: (key, value) => {
      load();
      held.set(key, value);
      schedule();
    },
    delete: (key) => {
      load();

      const had = held.delete(key);

      if (had) {
        schedule();
      }

      return had;
    },
    sweep: (predicate) => {
      load();

      let dropped = 0;

      for (const [key, value] of held) {
        if (predicate && !predicate(value, key)) {
          continue;
        }

        held.delete(key);
        dropped += 1;
      }

      if (dropped > 0) {
        schedule();
      }

      return dropped;
    },
    // Reports what the store is *holding*, not what the file has: a caller that
    // released the memory tier must see zero, and the next read is what takes the
    // entries back.
    size: () => held.size,
    entries: () => {
      load();

      return held.entries();
    },
    persist,
    /** Let go of the entries but keep the file: the next read takes them back. */
    release: () => {
      persist();

      const released = held.size;

      held.clear();
      dirty = false;
      loaded = false;

      return released;
    },
    /** Forget both tiers. */
    clear: () => {
      held.clear();
      dirty = true;
      persist();
    },
  };
}
