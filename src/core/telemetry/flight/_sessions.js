

/** @module core/telemetry/flight/sessions */

/**
 * The per-session summary rows.
 *
 * A shared daemon gives every client its own session, so one recording window
 * routinely holds several. They are summarized rather than nested, because the
 * timeline already carries `sessionId` on every event.
 *
 * @param {object[]} events - time-ordered
 * @returns {object[]}
 */
export function summarizeSessions(events) {
  const groups = new Map();

  for (const event of events) {
    const id = event.session ?? "unknown";
    const row = groups.get(id) ?? {
      id,
      transport: event.transport ?? "stdio",
      client: event.client,
      startedAt: event.ts,
      endedAt: event.ts,
      calls: 0,
    };

    row.startedAt = Math.min(row.startedAt, event.ts);
    row.endedAt = Math.max(row.endedAt, event.ts);
    row.calls += 1;
    row.client ??= event.client;
    groups.set(id, row);
  }

  return [...groups.values()].sort((a, b) => a.startedAt - b.startedAt);
}
