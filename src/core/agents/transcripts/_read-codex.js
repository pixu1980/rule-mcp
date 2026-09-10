

/** Read Codex transcripts for one project window. */
import { join } from "node:path";
import { inWindow, emptyUsage } from "./_window.js";
import { readJsonl, filesUnder } from "./_fs.js";

/**
 * Codex: a rollout JSONL per session, dated directories, and a `token_count`
 * event that already carries a running total. The last one is the answer, so
 * summing them would count every call as many times as it was reported.
 *
 * @param {{ projectDir: string, home: string }} context
 * @returns {object|undefined}
 */
export function readCodex({ projectDir, home, ...window }) {
  // sessions/YYYY/MM/DD/rollout-*.jsonl - three levels of dated directories.
  const files = filesUnder(join(home, ".codex", "sessions"), 3);
  const usage = emptyUsage();
  let model;
  let provider;
  let contextWindow;
  let found = false;

  for (const file of files) {
    const rows = readJsonl(file);
    const meta = rows.find((row) => row.type === "session_meta")?.payload;

    if (meta?.cwd !== projectDir) {
      continue;
    }

    found = true;
    // The model is on the turn_context rows, not on session_meta.
    model ||= rows.find((row) => row.payload?.model)?.payload?.model;
    provider ||= meta.model_provider;

    for (const row of rows) {
      if (row.payload?.type !== "token_count" || !inWindow(row.timestamp, window)) {
        continue;
      }

      const info = row.payload.info ?? {};
      const total = info.total_token_usage ?? {};

      usage.apiCalls += 1;
      usage.input = Number(total.input_tokens) || usage.input;
      usage.output = Number(total.output_tokens) || usage.output;
      usage.cacheRead = Number(total.cached_input_tokens) || usage.cacheRead;
      usage.reasoning = Number(total.reasoning_output_tokens) || usage.reasoning;
      usage.peakContext = Math.max(usage.peakContext, Number(info.last_token_usage?.total_tokens) || 0);
      contextWindow = Number(info.model_context_window) || contextWindow;
    }

    usage.userTurns += rows.filter((row) => row.payload?.type === "user_message").length;
  }

  if (!found) {
    return;
  }

  return { ...usage, model, provider, ...(contextWindow && { contextWindow }) };
}
