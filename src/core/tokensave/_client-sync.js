

/**
 * @module core/tokensave/client-sync
 *
 * The synchronous half of the TokenSave client, for callers whose existing
 * API is synchronous (the file-tree scan, the handoff sources). It exists so
 * the read-only consumers keep their shape while the async client stays the
 * default for new code.
 *
 * @see module:core/tokensave/client - the async client and the error shape
 */

import { execFileSync } from "node:child_process";

import { parseToolEnvelope } from "./_client.js";

/** Default wall clock for one synchronous TokenSave call. */
export const DEFAULT_SYNC_TIMEOUT_MS = 30_000;

/** Largest stdout the client will buffer. */
const MAX_BUFFER = 10 * 1024 * 1024;

/** A one-line reason from a child-process failure. */
function reasonOf(error) {
  return String(error?.stderr || error?.message || error).trim();
}

/**
 * Call one TokenSave tool through the CLI, synchronously.
 *
 * @param {string} name - Tool name, without the `tokensave_` prefix
 * @param {object} [args] - Tool parameters, serialized as `--args <json>`
 * @param {{ projectDir?: string, timeoutMs?: number }} [options]
 * @returns {{ ok: true, value: unknown } | { ok: false, unavailable: true, error: string }}
 */
export function callToolSync(name, args = {}, { projectDir = process.cwd(), timeoutMs = DEFAULT_SYNC_TIMEOUT_MS } = {}) {
  const argv = ["tool", name, "--json", "--args", JSON.stringify(args), "--project", projectDir];

  try {
    const stdout = execFileSync("tokensave", argv, {
      timeout: timeoutMs,
      maxBuffer: MAX_BUFFER,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return { ok: true, value: parseToolEnvelope(JSON.parse(stdout)) };
  } catch (error) {
    return { ok: false, unavailable: true, error: reasonOf(error) };
  }
}
