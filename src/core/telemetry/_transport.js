

/**
 * @module core/telemetry/transport
 *
 * The remote path, built and switched off.
 *
 * There is no aggregator to send to yet, and sending anything about a
 * developer's work to a server they did not choose needs a legal basis before
 * it needs an implementation. So this module exists to fix two things now,
 * while they are cheap: the shape of what would leave the machine, and the fact
 * that it does not leave by default.
 *
 * The redaction is deliberately lossy. A remote payload carries counts,
 * durations and hashes; it carries no identity, no path, no code and no free
 * text the user wrote. That means some questions cannot be answered remotely -
 * which is the intended trade, since the local log answers them for the person
 * whose data it is.
 *
 * @see module:core/telemetry - what is recorded locally
 */

import { createHash } from "node:crypto";
import { extname } from "node:path";

/**
 * Whether events are sent anywhere. Off, and not switchable by environment on
 * purpose: turning this on is a decision with a legal basis attached, so it
 * should be a reviewed code change and not a variable somebody exports.
 */
export const REMOTE_ENABLED = false;

/** Fields safe to forward as they are: counts, durations, outcomes. */
const SAFE_FIELDS = ["ts", "tool", "durationMs", "ok", "cacheHit", "routedSkill", "guardrailFailures", "promptLength", "estimatedRouting", "transport"];

/** @param {string} value @returns {string} */
const hash = (value) => createHash("sha256").update(String(value)).digest("hex").slice(0, 16);

/**
 * Reduce a local event to what could leave the machine.
 *
 * Identity goes first: without session and installation, a payload cannot be
 * tied back to a person or a machine even by whoever receives it. A path
 * becomes a hash plus its extension, which is enough to say "the same file
 * again" and "a TypeScript file" without saying where it lives or what the
 * project is called.
 *
 * @param {object} event - a local telemetry event
 * @returns {object} the redacted payload
 */
export function redactForRemote(event) {
  const out = {};

  for (const field of SAFE_FIELDS) {
    if (event?.[field] !== undefined) {
      out[field] = event[field];
    }
  }

  if (event?.saved) {
    out.saved = Object.fromEntries(Object.entries(event.saved).map(([source, value]) => [source, Number(value) || 0]));
  }

  if (event?.path) {
    out.pathHash = hash(event.path);
    out.extension = extname(event.path);
  }

  return out;
}

/**
 * The transport interface a future aggregator implements. Kept as a shape
 * rather than a class so a test double is one object literal.
 *
 * @typedef {{ name: string, send: (payloads: object[]) => Promise<void> }} TelemetryTransport
 */

/** The only transport there is: it does nothing, and says so. */
export const localOnlyTransport = {
  name: "local-only",
  async send() {
    // Deliberately empty. The local JSONL is the whole system today.
  },
};

/**
 * Send, if sending were enabled. It is not, so this returns without doing
 * anything, and exists so the call site is already written when it is.
 *
 * @param {object[]} events
 * @param {TelemetryTransport} [transport]
 * @returns {Promise<{ sent: number, reason?: string }>}
 */
export async function send(events, transport = localOnlyTransport) {
  if (!REMOTE_ENABLED) {
    return { sent: 0, reason: "remote telemetry is disabled" };
  }

  const payloads = events.map((event) => redactForRemote(event));

  await transport.send(payloads);

  return { sent: payloads.length };
}
