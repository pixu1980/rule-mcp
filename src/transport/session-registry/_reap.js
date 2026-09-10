

/** Reaping: find the sessions the sweep should let go, and close them. */
import { closeSession } from "./_close.js";

/**
 * Close the sessions whose stream is gone or that have been idle too long.
 *
 * @param {import("./_registry.js").SessionRegistry} registry
 * @param {{ now?: number, idleMs?: number }} [options]
 * @returns {Promise<string[]>} The ids that were closed
 */
export async function reapIdle(registry, options = {}) {
  const now = options.now ?? Date.now();
  const idleMs = options.idleMs ?? registry.idleMs;
  const doomed = [];

  for (const [id, session] of registry._sessions) {
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
    await closeSession(registry, id);
  }

  return doomed;
}
