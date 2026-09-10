

/** Read opencode transcripts for one project window. */
import { dirname, join } from "node:path";
import { inWindow, emptyUsage } from "./_window.js";
import { readJson, filesUnder } from "./_fs.js";

/**
 * opencode: one JSON file per message, grouped by session directory, and the
 * project it belongs to is written inside the message rather than into a path.
 *
 * @param {{ projectDir: string, home: string }} context
 * @returns {object|undefined}
 */
export function readOpencode({ projectDir, home, ...window }) {
  const base = join(home, ".local", "share", "opencode", "storage", "message");
  const files = filesUnder(base, 1);
  const usage = emptyUsage();
  let cost = 0;
  let hasCost = false;
  let model;
  let provider;
  // A user message carries no `path` of its own, so the project can only be
  // recognized from the assistant messages it shares a session directory with.
  // Two passes: find this project's sessions, then read everything in them.
  const rows = files.map((file) => ({ file, row: readJson(file) })).filter((entry) => entry.row);
  const sessions = new Set(rows.filter((entry) => (entry.row.path?.root ?? entry.row.path?.cwd) === projectDir).map((entry) => entry.row.sessionID ?? dirname(entry.file)));

  if (sessions.size === 0) {
    return;
  }

  for (const { file, row } of rows) {
    if (!sessions.has(row.sessionID ?? dirname(file))) {
      continue;
    }

    if (!inWindow(row.time?.created, window)) {
      continue;
    }

    if (row.role === "user") {
      usage.userTurns += 1;
    }

    const tokens = row.tokens;

    if (!tokens) {
      continue;
    }

    usage.apiCalls += 1;
    const input = Number(tokens.input) || 0;
    const cacheRead = Number(tokens.cache?.read) || 0;
    const cacheWrite = Number(tokens.cache?.write) || 0;

    usage.input += input;
    usage.output += Number(tokens.output) || 0;
    usage.cacheRead += cacheRead;
    usage.cacheWrite += cacheWrite;
    usage.reasoning += Number(tokens.reasoning) || 0;
    usage.peakContext = Math.max(usage.peakContext, input + cacheRead + cacheWrite);

    if (row.cost !== undefined) {
      cost += Number(row.cost) || 0;
      hasCost = true;
    }

    model ||= row.modelID;
    provider ||= row.providerID;
  }

  return { ...usage, model, provider, ...(hasCost && { costUsd: cost }) };
}
