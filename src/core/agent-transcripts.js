/**
 * @module core/agent-transcripts
 *
 * What the model spent, read from the coding agent's own transcript.
 *
 * This server never calls a model, so it cannot know the numbers that decide
 * whether a session was expensive: input and output tokens, what the prompt
 * cache absorbed, how close the context came to the window, what it cost. The
 * agent driving it writes all of that to disk for its own history. At export
 * time we read that file, for the project we were recording, and put the real
 * figures next to our own.
 *
 * Every adapter here was written against a file produced by the tool it names.
 * An agent whose usage is not on disk in a machine-readable form is listed as
 * unsupported WITH THE REASON, and contributes nothing - a fabricated zero in a
 * benchmark is worse than an absent number, because a zero gets averaged.
 *
 * A transcript directory holds every session that agent ever ran on the
 * project, so the read is scoped to the recording window. Without that scoping
 * an export of five tool calls reports the repository's lifetime totals, which
 * is off by orders of magnitude rather than slightly wrong. Rows outside the
 * window are skipped; rows with no timestamp are kept, because dropping them
 * would silently lose a whole agent whose format does not stamp its messages.
 *
 * @see module:core/agent-command-targets - the same agents, as install targets
 * @see module:core/telemetry-flight - what does the reading
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * How far outside the recorded calls a model turn still belongs to the session.
 *
 * The user's prompt and the model turn that decided to call us happen BEFORE
 * our first recorded call, and the turn that consumed our last result happens
 * after it. A window drawn exactly on the calls would drop both, and the first
 * turn is usually the expensive one - it is the one that writes the prompt
 * cache. Five minutes is wide enough for a turn and far too narrow for a
 * previous session.
 */
export const USAGE_WINDOW_SLACK_MS = 5 * 60_000;

/**
 * Whether a row falls inside the recording window.
 *
 * An unparseable or missing timestamp counts as inside: the alternative is
 * discarding data because of a field the format never promised.
 *
 * @param {string|number|undefined} at
 * @param {{ since?: number, until?: number }} window
 * @returns {boolean}
 */
function inWindow(at, window) {
  if (window.since === undefined && window.until === undefined) {
    return true;
  }

  const ms = typeof at === "number" ? at : Date.parse(at ?? "");

  if (!Number.isFinite(ms)) {
    return true;
  }

  if (window.since !== undefined && ms < window.since - USAGE_WINDOW_SLACK_MS) {
    return false;
  }

  return window.until === undefined || !(ms > window.until + USAGE_WINDOW_SLACK_MS);
}

/** An empty tally, so every adapter returns the same shape. */
const emptyUsage = () => ({
  apiCalls: 0,
  userTurns: 0,
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  reasoning: 0,
  peakContext: 0,
});

/**
 * Read a JSONL file into parsed objects, skipping anything unparseable.
 *
 * A transcript is appended to live, so the last line of the file the agent is
 * still writing is routinely half a line. That is not a corrupt transcript.
 *
 * @param {string} file
 * @returns {object[]}
 */
function readJsonl(file) {
  try {
    return readFileSync(file, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** @param {string} file @returns {object|undefined} */
function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return;
  }
}

/** @param {string} dir @returns {string[]} absolute paths of the entries, or none */
function list(dir) {
  try {
    return readdirSync(dir).map((entry) => join(dir, entry));
  } catch {
    return [];
  }
}

/** @param {string} file @returns {number} mtime, or 0 for anything unreadable */
function mtime(file) {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Files under `dir`, newest first, recursing to `depth` levels of directories.
 *
 * @param {string} dir
 * @param {number} depth
 * @returns {string[]}
 */
function filesUnder(dir, depth = 1) {
  if (!existsSync(dir)) {
    return [];
  }

  const found = [];
  const walk = (current, left) => {
    for (const entry of list(current)) {
      let directory;
      try {
        directory = statSync(entry).isDirectory();
      } catch {
        continue;
      }

      if (directory) {
        if (left > 0) {
          walk(entry, left - 1);
        }
      } else {
        found.push(entry);
      }
    }
  };
  walk(dir, depth);

  return found.sort((a, b) => mtime(b) - mtime(a));
}

/**
 * Whether a message body is a tool result rather than something a person typed.
 *
 * @param {unknown} content
 * @returns {boolean}
 */
function isToolResult(content) {
  return Array.isArray(content) && content.some((block) => block?.type === "tool_result");
}

/**
 * How each agent encodes a project directory in its own paths, so a transcript
 * can be matched to the repository this server was recording.
 *
 * @param {string} projectDir
 * @returns {{ pi: string, claude: string }}
 */
function slugsFor(projectDir) {
  return {
    // `--Users-me-Projects-app--`: separators become dashes, wrapped in a pair.
    pi: `--${projectDir.replace(/^\//, "").replaceAll("/", "-")}--`,
    // `-Users-me-Projects-app`: separators become dashes, leading one kept.
    claude: projectDir.replaceAll("/", "-"),
  };
}

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
function readPi({ projectDir, home, ...window }) {
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

/**
 * Claude Code: one JSONL per session under a per-project directory, Anthropic's
 * own field names inside `message.usage`. No cost is written, so none is
 * reported.
 *
 * @param {{ projectDir: string, home: string }} context
 * @returns {object|undefined}
 */
function readClaude({ projectDir, home, ...window }) {
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

/**
 * Codex: a rollout JSONL per session, dated directories, and a `token_count`
 * event that already carries a running total. The last one is the answer, so
 * summing them would count every call as many times as it was reported.
 *
 * @param {{ projectDir: string, home: string }} context
 * @returns {object|undefined}
 */
function readCodex({ projectDir, home, ...window }) {
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

/**
 * opencode: one JSON file per message, grouped by session directory, and the
 * project it belongs to is written inside the message rather than into a path.
 *
 * @param {{ projectDir: string, home: string }} context
 * @returns {object|undefined}
 */
function readOpencode({ projectDir, home, ...window }) {
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
  const sessions = new Set(
    rows
      .filter((entry) => (entry.row.path?.root ?? entry.row.path?.cwd) === projectDir)
      .map((entry) => entry.row.sessionID ?? dirname(entry.file)),
  );

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

/**
 * The agents this server can read usage from, and the ones it cannot.
 *
 * `read` is absent exactly when `reason` is present. Keeping both in one table
 * means "which agents are covered" is answered by the code that does the
 * covering, and an unsupported agent cannot quietly turn into a silent zero.
 *
 * @type {Array<{ agent: string, label: string, read?: Function, reason?: string }>}
 */
export const AGENT_TRANSCRIPTS = [
  { agent: "pi", label: "pi", read: readPi },
  { agent: "claude", label: "Claude Code", read: readClaude },
  { agent: "codex", label: "Codex", read: readCodex },
  { agent: "opencode", label: "opencode", read: readOpencode },
  {
    agent: "copilot",
    label: "GitHub Copilot CLI",
    reason: "~/.copilot keeps process logs, not per-call token usage.",
  },
  {
    agent: "cursor",
    label: "Cursor",
    reason: "Cursor keeps its conversation history in an application database, with no documented usage schema.",
  },
  {
    agent: "windsurf",
    label: "Windsurf",
    reason: "Windsurf writes no per-call token usage to a readable file.",
  },
  {
    agent: "vibe",
    label: "Mistral Vibe",
    reason: "Vibe's session format is not verified against a published spec.",
  },
];

/**
 * When the unsupported list above was last checked against reality, and when
 * to check again. An agent that starts writing readable usage does not
 * announce it; a list nobody revisits silently turns into a wrong answer
 * (hardening 4.7).
 *
 * Reviewed: 2026-09-04 - Next review: 2026-12-04 (quarterly)
 */
export const UNSUPPORTED_REVIEWED_AT = "2026-09-04";

/** @returns {string[]} the agents whose usage can be read */
export function supportedAgents() {
  return AGENT_TRANSCRIPTS.filter((entry) => entry.read).map((entry) => entry.agent);
}

/** @returns {Array<{ agent: string, label: string, reason: string }>} the ones that cannot, and why */
export function unsupportedAgents() {
  return AGENT_TRANSCRIPTS.filter((entry) => !entry.read).map(({ agent, label, reason }) => ({
    agent,
    label,
    reason,
  }));
}

/**
 * Read one agent's usage for one project.
 *
 * @param {{ agent: string, projectDir: string, home?: string, since?: number, until?: number }} options
 * @returns {object|undefined} the tally, or nothing when that agent never ran here
 */
export function readAgentUsage(options) {
  const entry = AGENT_TRANSCRIPTS.find((item) => item.agent === options.agent);

  if (!entry?.read) {
    return;
  }

  try {
    const usage = entry.read({
      projectDir: options.projectDir,
      home: options.home ?? homedir(),
      since: options.since,
      until: options.until,
    });
    if (!usage) {
      return;
    }

    const window =
      options.since === undefined && options.until === undefined
        ? undefined
        : { since: options.since, until: options.until, slackMs: USAGE_WINDOW_SLACK_MS };

    return { ...usage, agent: entry.agent, ...(window && { window }) };
  } catch {
    // A transcript in a shape this adapter does not know is a missing number,
    // never a failed export.
    return;
  }
}

/**
 * Read whichever agent actually worked on this project.
 *
 * When more than one has, the busiest wins: an agent that made two calls while
 * another made two hundred is a stray session, not the one being benchmarked.
 *
 * @param {{ projectDir: string, home?: string, client?: string, since?: number, until?: number }} options
 * @returns {object|undefined}
 */
export function detectAgentUsage(options) {
  const candidates = [];

  for (const agent of supportedAgents()) {
    const usage = readAgentUsage({ ...options, agent });

    if (usage && usage.apiCalls > 0) {
      candidates.push(usage);
    }
  }

  if (candidates.length === 0) {
    return;
  }
  // The client name from the MCP handshake breaks a tie when it names one of
  // them, because that is the agent that was actually holding the connection.
  // Ternary, not `&&`: an empty client name is a falsy STRING that `??` does
  // not fall through, which would collapse the whole function to "".
  const client = String(options.client ?? "").toLowerCase();
  const named = client ? candidates.find((usage) => client.includes(usage.agent)) : undefined;

  return named ?? candidates.sort((a, b) => b.apiCalls - a.apiCalls)[0];
}
