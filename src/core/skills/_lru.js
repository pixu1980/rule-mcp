/** @module core/skills/lru - the read-through cache for skill content */

/** Simple in-memory LRU cache for skill content (read-through). */
class LruCache {
  /**
   * @param {number} maxSize - Max entries before eviction (default 50)
   */
  constructor(maxSize = 50) {
    /** @type {Map<string, string>} */
    this._map = new Map();
    this._maxSize = maxSize;
  }
  /**
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this._map.has(key);
  }
  /**
   * Get a value, promoting it to MRU position.
   * @param {string} key
   * @returns {string|undefined}
   */
  get(key) {
    if (!this._map.has(key)) {
      return;
    }

    const value = this._map.get(key);
    this._map.delete(key);
    this._map.set(key, value);

    return value;
  }
  /**
   * Set a value, evicting LRU if over maxSize.
   * @param {string} key
   * @param {string} value
   */
  set(key, value) {
    if (this._map.has(key)) {
      this._map.delete(key);
    }

    this._map.set(key, value);

    if (this._map.size <= this._maxSize) {
      return;
    }

    const firstKey = this._map.keys().next().value;

    if (firstKey !== undefined) {
      this._map.delete(firstKey);
    }
  }
  /** Clear all entries. */
  clear() {
    this._map.clear();
  }
  /** @returns {number} */
  get size() {
    return this._map.size;
  }
}
/**
 * Global LRU cache for skill content.
 * Allows caching frequently accessed SKILL.md content
 * and parsed metadata across requests.
 */
export const skillCache = new LruCache(50);
