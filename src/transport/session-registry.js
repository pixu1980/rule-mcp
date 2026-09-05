/**
 * @module transport/session-registry
 *
 * The sessions an HTTP or SSE daemon is holding, and when to let them go.
 *
 * Each session owns an MCP Server instance, so a session that is never
 * released is a Server, a transport and their closures kept alive for the life
 * of the daemon. The transports do signal their own close - but only when the
 * peer closes politely. A client that is killed, a laptop that sleeps, a
 * network that drops mid-stream leave a session whose response object is dead
 * and whose `onclose` never fires.
 *
 * So closing is driven by two things instead of one: the transport's own
 * callback, and a sweep that asks each session whether its stream is still
 * there and when it was last used. The sweep timer is unref'd - reaping is
 * housekeeping and must never be the reason a process stays alive.
 *
 * @see module:transport/http, module:transport/sse - both keep one of these
 */

/** Default idle ceiling: a session nobody has touched in an hour is gone. */
export const DEFAULT_IDLE_MS = 3_600_000;

/** Default sweep interval. */
export const DEFAULT_SWEEP_MS = 60_000;

/** Default session ceiling - bounds memory against session-creation floods. */
export const DEFAULT_MAX_SESSIONS = 256;

/**
 * The live MCP sessions of one server, capped and evictable.
 *
 * A transport that keeps sessions in a bare Map grows without bound and has
 * nothing to close on shutdown; this owns both ends.
 */
export class SessionRegistry {
  /**
   * @param {{ maxSessions?: number, idleMs?: number, sweepMs?: number, label?: string }} [options]
   */
  constructor(options = {}) {
    this.maxSessions = options.maxSessions ?? DEFAULT_MAX_SESSIONS;
    this.idleMs = options.idleMs ?? DEFAULT_IDLE_MS;
    this.sweepMs = options.sweepMs ?? DEFAULT_SWEEP_MS;
    this.label = options.label ?? "session";
    /** @type {Map<string, { transport: object, server: object, isDead?: () => boolean, lastSeen: number }>} */
    this._sessions = new Map();
    /** @type {NodeJS.Timeout|null} */
    this._sweeper = null;
  }

  /** @returns {NodeJS.Timeout} An unref'd interval that reaps. */
  #newSweeper() {
    const timer = setInterval(() => {
      void this.reap().catch(() => {});
    }, this.sweepMs);
    timer.unref?.();

    return timer;
  }

  /** @returns {number} */
  get size() {
    return this._sessions.size;
  }

  /** @returns {boolean} Whether a sweep timer is running. */
  get sweeping() {
    return this._sweeper !== null;
  }

  /** @returns {boolean} Whether the session ceiling has been reached. */
  atCapacity() {
    return this._sessions.size >= this.maxSessions;
  }

  /**
   * @param {string} id
   * @param {{ transport: object, server: object, isDead?: () => boolean }} session
   * @param {{ now?: number }} [options]
   */
  add(id, session, options = {}) {
    this._sessions.set(id, { ...session, lastSeen: options.now ?? Date.now() });
  }

  /**
   * @param {string} id
   * @returns {{ transport: object, server: object }|undefined}
   */
  get(id) {
    return this._sessions.get(id);
  }

  /**
   * Record that a session was used, so the sweep leaves it alone.
   *
   * @param {string} id
   * @param {number} [now]
   */
  touch(id, now = Date.now()) {
    const session = this._sessions.get(id);

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
    return this._sessions.delete(id);
  }

  /**
   * Close one session's transport and server, then forget it. Never throws.
   *
   * @param {string} id
   * @returns {Promise<boolean>} Whether the id was present
   */
  async close(id) {
    const session = this._sessions.get(id);

    if (!session) {
      return false;
    }

    this._sessions.delete(id);
    try {
      // Drop the callback first: it would only call back into a map that has
      // already forgotten this id.
      session.transport.onclose = null;
      await session.transport.close?.();
    } catch {
      /* a transport whose peer is gone throws on close; it is gone either way */
    }

    try {
      await session.server.close?.();
    } catch {
      /* same */
    }

    return true;
  }

  /**
   * Close the sessions whose stream is gone or that have been idle too long.
   *
   * @param {{ now?: number, idleMs?: number }} [options]
   * @returns {Promise<string[]>} The ids that were closed
   */
  async reap(options = {}) {
    const now = options.now ?? Date.now();
    const idleMs = options.idleMs ?? this.idleMs;
    const doomed = [];

    for (const [id, session] of this._sessions) {
      // A session that cannot answer whether it is alive is treated as dead:
      // the question is asked of a stream, and a stream that throws is gone.
      let dead;
      try {
        dead = session.isDead?.() === true;
      } catch {
        dead = true;
      }

      if (dead || now - session.lastSeen > idleMs) {
        doomed.push(id);
      }
    }

    for (const id of doomed) {
      await this.close(id);
    }

    return doomed;
  }

  /**
   * Start the sweep. Unref'd, and idempotent.
   *
   * @returns {NodeJS.Timeout}
   */
  startSweeper() {
    this._sweeper ??= this.#newSweeper();

    return this._sweeper;
  }

  /** Stop the sweep. */
  stopSweeper() {
    if (!this._sweeper) {
      return;
    }

    clearInterval(this._sweeper);
    this._sweeper = null;
  }

  /**
   * Close every session and stop sweeping. Never throws.
   *
   * @returns {Promise<number>} How many sessions were closed
   */
  async closeAll() {
    this.stopSweeper();
    const ids = [...this._sessions.keys()];

    for (const id of ids) {
      await this.close(id);
    }

    this._sessions.clear();

    return ids.length;
  }
}
