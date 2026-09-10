

/** Read pi transcripts for one project window. */
import { join } from "node:path";
import { inWindow, emptyUsage } from "./_window.js";
import { readJsonl, filesUnder, slugsFor } from "./_fs.js";

/**
 * pi: one JSONL per session, every row an envelope whose `message` carries the
 * role, the model, the `usage` block and real money in `usage.cost.total`.
 *
 * The role is where a naive read goes wrong: pi has a third role, `toolResult`,
 * so counting everything that is not an assistant message as a user turn
 * inflates the human's turn count by however many tools ran.
 *
 * @param {{ projectDir: string, home: string, since?: number, until?: number }} context
 * @returns {object|undefined}
 */
export function readPi({ projectDir, home, ...window }) {
  const dir = join(home, ".pi", "agent", "sessions", slugsFor(projectDir).pi);
  const files = filesUnder(dir, 0);

  if (files.length === 0) {
    return;
  }

  const usage = emptyUsage();
  let cost = 0;
  let hasCost = false;
  let model;
  let provider;

  for (const file of files) {
    for (const row of readJsonl(file)) {
      // The envelope is optional only in the sense that older rows are flat;
      // reading both shapes costs one `??` and survives a format that moved.
      const message = row.message ?? row;

      if (!inWindow(row.timestamp ?? message.timestamp, window)) {
        continue;
      }

      if (message.role === "user") {
        usage.userTurns += 1;
      }

      const block = message.usage;

      if (!block) {
        continue;
      }

      usage.apiCalls += 1;
      usage.input += Number(block.input) || 0;
      usage.output += Number(block.output) || 0;
      usage.cacheRead += Number(block.cacheRead) || 0;
      usage.cacheWrite += Number(block.cacheWrite) || 0;
      usage.reasoning += Number(block.reasoning) || 0;
      // The peak is a maximum, never a sum: adding context sizes across calls
      // produces a multiple of the window, which is the exact mistake the
      // hand-written reports had to correct for.
      usage.peakContext = Math.max(usage.peakContext, Number(block.totalTokens) || 0);

      if (block.cost?.total !== undefined) {
        cost += Number(block.cost.total) || 0;
        hasCost = true;
      }

      model ||= message.model;
      provider ||= message.provider;
    }
  }

  return { ...usage, model, provider, ...(hasCost && { costUsd: cost }) };
}
