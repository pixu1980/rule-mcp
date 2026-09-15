/**
 * @module core/tokensave/client
 *
 * The one place that knows how to call the TokenSave CLI.
 *
 * TokenSave exposes its 89 tools on two surfaces: the MCP server and
 * `tokensave tool <name>`. This module uses the CLI because the adapter runs
 * inside a Node process that is itself an MCP server and has no MCP client.
 * Every call maps to:
 *
 *     tokensave tool <name> --json --args <json> --project <path>
 *
 * The result is always an object with `ok`; a missing binary, a non-zero exit
 * and a malformed envelope all become `{ ok: false, unavailable: true }`, so
 * callers branch on one shape instead of catching.
 *
 * @see module:core/tokensave/fallback - the branching helper
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Default wall clock for one TokenSave call. */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** Largest stdout the client will buffer. */
const MAX_BUFFER = 10 * 1024 * 1024;

/** Raised when the graph or the binary cannot answer. */
export class TokensaveUnavailableError extends Error {
  /** @param {string} message - Why the call could not be served. */
  constructor(message) {
    super(message);
    this.name = "TokensaveUnavailableError";
  }
}

/**
 * Is this a result the fallback should treat as "graph unavailable"?
 *
 * @param {unknown} result
 * @returns {boolean}
 */
export function isUnavailable(result) {
  return Boolean(result && typeof result === "object" && result.unavailable === true);
}

/**
 * Unwrap the MCP text envelope the CLI prints.
 *
 * `tokensave tool --json` prints `{ content: [{ type: "text", text }] }`. The
 * text is JSON for structured tools and plain text for the resource tools; a
 * parse failure is returned as the raw string, not thrown.
 *
 * @param {{ content?: Array<{ type?: string, text?: string }> }} envelope
 * @returns {unknown} the parsed payload, the raw text, or `null`
 */
export function parseToolEnvelope(envelope) {
  const item = envelope?.content?.find((entry) => entry?.type === "text" && typeof entry.text === "string");

  if (!item) {
    return null;
  }

  try {
    return JSON.parse(item.text);
  } catch {
    return item.text;
  }
}

/** A one-line reason from a child-process failure. */
function reasonOf(error) {
  return String(error?.stderr || error?.message || error).trim();
}

/**
 * Call one TokenSave tool through the CLI.
 *
 * @param {string} name - Tool name, without the `tokensave_` prefix
 * @param {object} [args] - Tool parameters, serialized as `--args <json>`
 * @param {{ projectDir?: string, timeoutMs?: number, exec?: Function }} [options]
 * @returns {Promise<{ ok: true, value: unknown } | { ok: false, unavailable: true, error: string }>}
 */
export async function callTool(name, args = {}, { projectDir = process.cwd(), timeoutMs = DEFAULT_TIMEOUT_MS, exec = execFileAsync } = {}) {
  const argv = ["tool", name, "--json", "--args", JSON.stringify(args), "--project", projectDir];

  try {
    const { stdout } = await exec("tokensave", argv, { timeout: timeoutMs, maxBuffer: MAX_BUFFER });

    return { ok: true, value: parseToolEnvelope(JSON.parse(stdout)) };
  } catch (error) {
    return { ok: false, unavailable: true, error: reasonOf(error) };
  }
}
