

/** @module core/telemetry/kpi/iterations */

/**
 * A pause longer than this between two prompts is read as the user coming back
 * with something new, rather than the same request still being worked on.
 *
 * Ninety seconds separates the two shapes it has to tell apart: a retry lands
 * seconds after the prompt it repeats, a follow-up minutes after. It is a
 * heuristic, and every count derived from it is flagged `estimated`.
 */
export const IDLE_GAP_MS = 90_000;

/**
 * How many separate times someone asked for something.
 *
 * Only the prompts this server saw are visible, so a follow-up typed at an
 * agent that never called a rule tool is invisible to the inference. That is
 * why the transcript's own user-turn count wins whenever it exists.
 *
 * @param {object[]} events
 * @param {number} idleGapMs
 * @returns {{ count: number, distinctPrompts: number, retries: number, estimated: boolean }}
 */
export function inferIterations(events, idleGapMs) {
  const prompted = events.filter((event) => event.promptLength !== undefined).sort((a, b) => a.ts - b.ts);
  const texts = new Set();
  let count = 0;
  let retries = 0;
  let previous;

  for (const event of prompted) {
    if (previous === undefined || event.ts - previous > idleGapMs) {
      count += 1;
    }
    // The same text asked twice is the signal the reports found most telling:
    // it means the first attempt produced nothing usable.
    if (event.prompt !== undefined) {
      if (texts.has(event.prompt)) {
        retries += 1;
      }

      texts.add(event.prompt);
    }

    previous = event.ts;
  }

  return { count, distinctPrompts: texts.size, retries, estimated: true };
}
