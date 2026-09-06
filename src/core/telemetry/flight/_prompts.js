/** @module core/telemetry/flight/prompts */

/**
 * The prompts, as their own block.
 *
 * Separate from the timeline for two reasons: a prompt is the only free text in
 * the file, so a reader who must not keep it can drop one key; and the shape a
 * benchmark wants is a numbered list of what was asked, not a field buried in
 * every call.
 *
 * @param {object[]} events - time-ordered
 * @returns {object[]}
 */
export function promptsOf(events) {
  const seen = new Set();
  const prompts = [];

  for (const event of events) {
    if (event.promptLength === undefined) {
      continue;
    }

    const repeat = event.prompt !== undefined && seen.has(event.prompt);

    if (event.prompt !== undefined) {
      seen.add(event.prompt);
    }

    prompts.push({
      ts: event.ts,
      tool: event.tool,
      session: event.session,
      length: event.promptLength,
      ...(event.routedSkill && { routedSkill: event.routedSkill }),
      ...(!(event.prompt === undefined) && { text: event.prompt }),
      // A prompt sent twice is the loudest signal in the recording: the first
      // attempt produced nothing the user could use.
      ...(repeat && { repeat: true }),
    });
  }

  return prompts;
}
