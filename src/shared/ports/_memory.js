/** @module shared/ports/memory - a store that lives in this process */

/**
 * A store that lives in this process and goes away with it.
 *
 * This is the implementation a process gets by default, and the one it should
 * keep until something needs another. A store that must outlive a restart is a
 * file the caller already writes itself, and wrapping that file in this shape
 * hides the things it needs: a namespace, a version, an atomic rename, a
 * debounce. Those belong to the writer, not to four methods about keys.
 *
 * @returns {StorePort}
 */
export function createMemoryStore() {
  const held = new Map();

  return {
    get: (key) => held.get(key),
    set: (key, value) => held.set(key, value),
    delete: (key) => held.delete(key),
    /** Drop every entry the predicate accepts, or all of them when it takes none. */
    sweep: (predicate) => {
      let dropped = 0;

      for (const [key, value] of held) {
        if (predicate && !predicate(value, key)) {
          continue;
        }

        held.delete(key);
        dropped += 1;
      }

      return dropped;
    },
    size: () => held.size,
    entries: () => held.entries(),
  };
}
