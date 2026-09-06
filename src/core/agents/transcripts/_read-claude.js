/** Read Claude Code transcripts for one project window. */
import { join } from "node:path";
import { inWindow, emptyUsage } from "./_window.js";
import { readJsonl, list, mtime, filesUnder, slugsFor, isToolResult } from "./_fs.js";

/**
 * Claude Code: one JSONL per session under a per-project directory, Anthropic's
 * own field names inside `message.usage`. No cost is written, so none is
 * reported.
 *
 * @param {{ projectDir: string, home: string }} context
 * @returns {object|undefined}
 */
export function readClaude({ projectDir, home, ...window }) {
  const dir = join(home, ".claude", "projects", slugsFor(projectDir).claude);
  const files = filesUnder(dir, 0);

  if (files.length === 0) {
    return;
  }

  const usage = emptyUsage();
  let model;

  for (const file of files) {
    for (const row of readJsonl(file)) {
      if (!inWindow(row.timestamp, window)) {
        continue;
      }
      // A tool result comes back as a user-role message, so counting every
      // `user` row as a human turn counts the tools instead of the person:
      // in a real transcript that was 196 tool results against 3 prompts.
      if (row.type === "user" && !isToolResult(row.message?.content)) {
        usage.userTurns += 1;
      }

      const block = row.message?.usage;

      if (!block) {
        continue;
      }

      usage.apiCalls += 1;
      const input = Number(block.input_tokens) || 0;
      const cacheRead = Number(block.cache_read_input_tokens) || 0;
      const cacheWrite = Number(block.cache_creation_input_tokens) || 0;
      const output = Number(block.output_tokens) || 0;

      usage.input += input;
      usage.output += output;
      usage.cacheRead += cacheRead;
      usage.cacheWrite += cacheWrite;
      usage.reasoning += Number(block.output_tokens_details?.thinking_tokens) || 0;
      // Anthropic reports the cached part separately from `input_tokens`, so the
      // context the model actually saw is the three of them together.
      usage.peakContext = Math.max(usage.peakContext, input + cacheRead + cacheWrite);
      model ||= row.message?.model;
    }
  }

  return { ...usage, model };
}
