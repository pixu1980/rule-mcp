/** The live MCP sessions of one server, capped and evictable. */
import { createMemoryStore } from "../../shared/ports/index.js";
import { DEFAULT_IDLE_MS, DEFAULT_MAX_SESSIONS, DEFAULT_SWEEP_MS } from "./_constants.js";
import { closeAllSessions, closeSession } from "./_close.js";
import { reapIdle } from "./_reap.js";
import { startSweeper, stopSweeper } from "./_sweeper.js";

/**
 * The live MCP sessions of one server, capped and evictable.
 *
 * A transport that keeps sessions in a bare Map grows without bound and has
 * nothing to close on shutdown; this owns both ends. Where they are held is the
 * store's business: the registry keeps the policy, the store keeps the entries.
 */
export class SessionRegistry {
  /**
   * @param {{ maxSessions?: number, idleMs?: number, sweepMs?: number, label?: string, store?: import("../../shared/ports/index.js").StorePort }} [options]
   */
  constructor(options = {}) {
    this.maxSessions = options.maxSessions ?? DEFAULT_MAX_SESSIONS;
    this.idleMs = options.idleMs ?? DEFAULT_IDLE_MS;
    this.sweepMs = options.sweepMs ?? DEFAULT_SWEEP_MS;
    this.label = options.label ?? "session";
    /** @type {import("../../shared/ports/index.js").StorePort} */
    this._store = options.store ?? createMemoryStore();
    /** @type {NodeJS.Timeout|null} */
    this._sweeper = null;
  }

  /** @returns {number} */
  get size() {
    return this._store.size();
  }

  /** @returns {boolean} Whether a sweep timer is running. */
  get sweeping() {
    return this._sweeper !== null;
  }

  /** @returns {boolean} Whether the session ceiling has been reached. */
  atCapacity() {
    return this._store.size() >= this.maxSessions;
  }

  /**
   * @param {string} id
   * @param {{ transport: object, server: object, isDead?: () => boolean }} session
   * @param {{ now?: number }} [options]
   */
  add(id, session, options = {}) {
    this._store.set(id, { ...session, lastSeen: options.now ?? Date.now() });
  }

  /**
   * @param {string} id
   * @returns {{ transport: object, server: object }|undefined}
   */
  get(id) {
    return this._store.get(id);
  }

  /**
   * Record that a session was used, so the sweep leaves it alone.
   *
   * @param {string} id
   * @param {number} [now]
   */
  touch(id, now = Date.now()) {
    const session = this._store.get(id);

    if (session) {
      session.lastSeen = now;
    }
  }

  /**
   * Drop a session without closing it - for the transport's own onclose, which
   * fires when the peer has already gone.
   *
   * @param {string} id
   * @returns {boolean} Whether the id was present
   */
  delete(id) {
    return this._store.delete(id);
  }

  /** @see module:_close */
  close(id) {
    return closeSession(this, id);
  }

  /** @see module:_reap */
  reap(options = {}) {
    return reapIdle(this, options);
  }

  /** @see module:_sweeper */
  startSweeper() {
    return startSweeper(this, this.sweepMs);
  }

  /** @see module:_sweeper */
  stopSweeper() {
    stopSweeper(this);
  }

  /** @see module:_close */
  closeAll() {
    return closeAllSessions(this);
  }
}
