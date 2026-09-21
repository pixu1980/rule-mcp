

/**
 * @module shared/ports
 *
 * The store shape a process keeps its state behind.
 *
 * A caller that holds its state in a bare Map cannot be handed another kind of
 * store without editing it, and cannot be driven by a test without reaching into
 * it. The port is the four operations both sides agree on - get, set, delete and
 * the sliding-window sweep - plus the two reads a caller needs to walk or bound
 * what it holds.
 *
 * @typedef {object} StorePort
 * @property {(key: string) => any} get
 * @property {(key: string, value: any) => void} set
 * @property {(key: string) => boolean} delete
 * @property {(predicate?: (value: any, key: string) => boolean) => number} sweep
 * @property {() => number} size
 * @property {() => Iterable<[string, any]>} entries
 */

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
