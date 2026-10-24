/** @module core/telemetry/recorder/session */

import { randomUUID } from "node:crypto";
import { flush } from "./_buffer.js";

let _session;
let _client;

/**
 * Remember which client connected, from the MCP handshake.
 *
 * A benchmark that cannot say which agent produced it is a benchmark of
 * nothing. The client is not the model - the protocol never carries that - so
 * the model is read later from the agent's own transcript.
 *
 * @param {{ name?: string, version?: string }} [info]
 */
export function setClientInfo(info) {
  const name = info?.name;

  _client = name ? (info.version ? `${name}/${info.version}` : name) : undefined;
}

/** @returns {string|undefined} the client that connected, as name/version */
export function clientInfo() {
  return _client;
}

/** @returns {string|undefined} the current session id */
export function sessionId() {
  return _session?.id;
}

/** @returns {{ id: string, transport: string }|undefined} the whole session row, for the recorder */
export function currentSession() {
  return _session;
}

/**
 * Begin a session. One MCP connection, one session.
 *
 * @param {{ transport?: string, now?: number }} [options]
 */
export function startSession(options = {}) {
  _session = {
    id: randomUUID(),
    transport: options.transport ?? "stdio",
    startedAt: options.now ?? Date.now(),
  };
}

/**
 * End the session and flush what is buffered.
 *
 * @param {{ now?: number }} [options]
 */
export function endSession(options = {}) {
  if (_session) {
    _session.endedAt = options.now ?? Date.now();
  }

  flush();
  _session = undefined;
}
