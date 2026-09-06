/** The agent transcript registry and the usage reads over it. */
import { homedir } from "node:os";
import { USAGE_WINDOW_SLACK_MS, emptyUsage } from "./_window.js";
import { readPi } from "./_read-pi.js";
import { readClaude } from "./_read-claude.js";
import { readCodex } from "./_read-codex.js";
import { readOpencode } from "./_read-opencode.js";

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
