

/** Closing sessions: one id, and everything on shutdown. */
/**
 * Close one session's transport and server, then forget it. Never throws.
 *
 * @param {import("./_registry.js").SessionRegistry} registry
 * @param {string} id
 * @returns {Promise<boolean>} Whether the id was present
 */
export async function closeSession(registry, id) {
  const session = registry._store.get(id);

  if (!session) {
    return false;
  }

  registry._store.delete(id);
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
 * Close every session and stop sweeping. Never throws.
 *
 * @returns {Promise<number>} How many sessions were closed
 */
export async function closeAllSessions(registry) {
  registry.stopSweeper();
  const ids = [...registry._store.entries()].map(([id]) => id);

  for (const id of ids) {
    await closeSession(registry, id);
  }

  registry._store.sweep();

  return ids.length;
}
