/**
 * @module core/telemetry/telemetry
 *
 * What this server records about its own work, and what it refuses to record.
 *
 * The recording rules come before the recording, and they are the
 * point of the module:
 *
 *   - **Prompt text is recorded, and can be turned off.** The length alone
 *     answered the metrics; it never answered the question a benchmark asks,
 *     which is what was asked for and how many times it had to be asked again.
 *     A prompt is the user's problem statement, often their employer's, so it
 *     stays on the user's own disk, in the project's own directory, and
 *     RULE_MCP_NO_PROMPTS=1 drops it back to a length. Nothing here is
 *     ever sent anywhere: see the remote rule below.
 *   - **Measured and estimated savings never merge.** Cache payloads, caveman
 *     before-and-after and tokensave's own counter are measured. "What a full
 *     file read would have cost" is a guess, kept in its own field, and always
 *     rendered with a tilde.
 *   - **What the server costs is measured too.** Every result is weighed on the
 *     way out, because the honest question about an MCP server is not only what
 *     it saved but what its own answers took up in the model's context.
 *   - **Local only.** A transport interface exists so a remote aggregator can be
 *     added later; it is off, and turning it on is a separate decision with a
 *     legal basis attached.
 *   - **Never break the call.** Recording is buffered, fire-and-forget, and
 *     swallows every error. A metric is never worth an outage.
 *
 * A session is one MCP connection. On a shared daemon each client is its own
 * session, which is what makes per-session numbers mean anything.
 *
 * Off with RULE_MCP_NO_TELEMETRY=1.
 *
 * @see module:core/telemetry/store - persistence and retention
 * @see module:core/telemetry/stats - reading it back
 * @see module:core/telemetry/transport - the remote path, disabled
 */

import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getRuntimePaths } from "../../cli/paths.js";
import { appendEvents, projectIdFile } from "./_store.js";

export { RAW_RETENTION_DAYS } from "./_store.js";

/** One day, in milliseconds. */
export const DAY_MS = 86_400_000;

/** Flush once the buffer reaches this, so a long session is not lost on a kill. */
const BUFFER_LIMIT = 25;

let _buffer = [];
let _session;
let _installation;
let _project;
let _client;

/**
 * Whether telemetry runs at all.
 * Off with RULE_MCP_NO_TELEMETRY=1.
 *
 * @returns {boolean}
 */
export function telemetryEnabled() {
  return process.env.RULE_MCP_NO_TELEMETRY !== "1";
}

/**
 * Whether the prompt text itself is recorded, or only its length.
 * On by default. Off with RULE_MCP_NO_PROMPTS=1.
 *
 * @returns {boolean}
 */
export function promptsEnabled() {
  return process.env.RULE_MCP_NO_PROMPTS !== "1";
}

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

/**
 * A random id for THIS project's current recording window.
 *
 * Distinct from the installation id: that one groups a machine across projects
 * and survives everything, while this one is reset by the export that carried
 * it away, so two exports of the same repository are never confused for one
 * continuous recording.
 *
 * @returns {string}
 */
export function projectId() {
  if (_project) {
    return _project;
  }

  const file = projectIdFile();

  try {
    if (existsSync(file)) {
      _project = readFileSync(file, "utf8").trim();

      if (_project) {
        return _project;
      }
    }

    _project = randomUUID();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, _project);
  } catch {
    _project ||= randomUUID();
  }

  return _project;
}

/** Forget the cached project id, so the next call reads or creates a new one. */
export function resetProjectId() {
  _project = undefined;
}

/**
 * A stable, random id for this installation. Not derived from anything about
 * the machine or the user: it exists to group this install's own numbers, and
 * a derived id would be a fingerprint.
 *
 * @returns {string}
 */
export function installationId() {
  if (_installation) {
    return _installation;
  }

  const file = join(getRuntimePaths().stateDir, "installation-id");
  try {
    if (existsSync(file)) {
      _installation = readFileSync(file, "utf8").trim();

      if (_installation) {
        return _installation;
      }
    }

    _installation = randomUUID();
    mkdirSync(getRuntimePaths().stateDir, { recursive: true });
    writeFileSync(file, _installation);
  } catch {
    _installation ||= randomUUID();
  }

  return _installation;
}

/** @returns {string|undefined} the current session id */
export function sessionId() {
  return _session?.id;
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

/** Write the buffer out. Never throws. */
export function flush() {
  if (_buffer.length === 0) {
    return;
  }

  const pending = _buffer;
  _buffer = [];
  try {
    appendEvents(pending);
  } catch {
    /* a metric is never worth an outage */
  }
}

/**
 * Record one tool call.
 *
 * `args` is accepted so the caller does not have to know the recording rules.
 * The prompt is taken from it verbatim when prompts are on and reduced to a
 * length when they are off; nothing else from it is ever stored, only its size.
 *
 * @param {{
 *   tool: string,
 *   args?: object,
 *   durationMs?: number,
 *   ok?: boolean,
 *   cacheHit?: boolean,
 *   cacheTier?: "exact"|"normalized"|"miss",
 *   entry?: "router"|"gateway"|"skill"|"action",
 *   routedSkill?: string,
 *   guardrailFailures?: number,
 *   guardrailRules?: Record<string, number>,
 *   resultBytes?: number,
 *   argsBytes?: number,
 *   coreTokens?: number,
 *   finalTokens?: number,
 *   reminderTokens?: number,
 *   replayedTokens?: number,
 *   mode?: string,
 *   resource?: boolean,
 *   saved?: { cache?: number, caveman?: number, tokensave?: number, estimatedRouting?: number },
 *   path?: string,
 *   now?: number,
 * }} call
 */
export function recordToolCall(call) {
  if (!telemetryEnabled() || !call?.tool) {
    return;
  }

  try {
    const { estimatedRouting, ...measured } = call.saved ?? {};
    const event = {
      ts: call.now ?? Date.now(),
      session: _session?.id ?? "unknown",
      installation: installationId(),
      transport: _session?.transport ?? "stdio",
      project: projectId(),
      tool: call.tool,
      durationMs: Number(call.durationMs) || 0,
      ok: call.ok !== false,
      cacheHit: Boolean(call.cacheHit),
    };
    // Which tier answered, and which path the call arrived on. Both are facets
    // of the call, not content, so neither touches the privacy contract below.
    if (call.cacheTier) {
      event.cacheTier = call.cacheTier;
    }

    if (call.entry) {
      event.entry = call.entry;
    }
    // The length is always kept, because it is the one prompt number that is
    // still there when the text has been switched off.
    const prompt = typeof call.args?.prompt === "string" ? call.args.prompt : undefined;

    if (prompt !== undefined) {
      event.promptLength = prompt.length;

      if (promptsEnabled()) {
        event.prompt = prompt;
      }
    }

    if (call.routedSkill) {
      event.routedSkill = call.routedSkill;
    }

    if (_client) {
      event.client = _client;
    }

    if (call.mode) {
      event.mode = call.mode;
    }
    // A resource read is not a tool call, and counting them together hides the
    // "read the whole skill file" strategy behind the "call the tool" one.
    if (call.resource) {
      event.resource = true;
    }
    // What this call weighed, in both directions. Bytes are what was measured;
    // the token figure beside them is the char/4 heuristic used project-wide,
    // kept as a field so no reader has to re-derive it.
    const resultBytes = Number(call.resultBytes) || 0;

    if (resultBytes > 0) {
      event.resultBytes = resultBytes;
      event.resultTokensEst = Math.ceil(resultBytes / 4);
    }

    const argsBytes = Number(call.argsBytes) || 0;

    if (argsBytes > 0) {
      event.argsBytes = argsBytes;
      event.argsTokensEst = Math.ceil(argsBytes / 4);
    }
    // Both ends of post-processing, not only the difference: caveman shrinks the
    // core result and the workflow reminder grows it again, and a ratio cannot
    // be recovered from a single saving figure. Named after what they are, not
    // after one of the two effects - calling the pair "caveman" produced a
    // compression percentage that went negative whenever the reminder won.
    if (typeof call.coreTokens === "number" && typeof call.finalTokens === "number") {
      event.coreTokens = call.coreTokens;
      event.finalTokens = call.finalTokens;
    }
    // What the reminder itself weighed, measured where it is appended. The pair
    // above cannot answer it: compression runs in the same step and the
    // difference is the two effects netted against each other.
    if (typeof call.reminderTokens === "number") {
      event.reminderTokens = call.reminderTokens;
    }
    // What a hit replayed. Recorded apart from `saved` because it is output the
    // model still reads, not a saving (ADR 079).
    if (typeof call.replayedTokens === "number") {
      event.replayedTokens = call.replayedTokens;
    }

    if (typeof call.guardrailFailures === "number") {
      event.guardrailFailures = call.guardrailFailures;
    }
    // Which rule failed, not just how many did. A count says a check went red;
    // only the rule ids say what the code actually got wrong.
    if (call.guardrailRules && Object.keys(call.guardrailRules).length > 0) {
      event.guardrailRules = call.guardrailRules;
    }

    if (Object.keys(measured).length > 0) {
      event.saved = measured;
    }
    // Estimated, and kept apart on purpose: merging it would inflate a measured
    // total with a guess, and the guess is the biggest number of the three.
    // Accepted at the top level or inside `saved`: callers think of it as a
    // saving, and it is stripped out of the measured bucket either way.
    // Zero is a result, not a missing value: a small skill can cost less than
    // the router's own answer, and dropping the zero made "routing saved
    // nothing here" indistinguishable from "nothing was estimated".
    const declared = call.estimatedRouting ?? estimatedRouting;

    if (declared !== undefined) {
      event.estimatedRouting = Number(declared) || 0;
    }

    if (call.path) {
      event.path = call.path;
    }

    _buffer.push(event);

    if (_buffer.length >= BUFFER_LIMIT) {
      flush();
    }
  } catch {
    /* never break the call being observed */
  }
}

/**
 * Hash a value for grouping without revealing it. Truncated to 16 hex
 * characters: enough to distinguish repositories, useless for reversing one.
 *
 * @param {string} value
 * @returns {string}
 */
export function hashValue(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}

// Flush what is buffered on a normal exit.
//
// Deliberately NOT on SIGINT or SIGTERM. Registering a listener for those
// removes Node's default termination behavior, so a core module that hooks
// them stops the whole process from dying on a signal - which is exactly what
// happened here: the SSE tests terminate their servers with SIGTERM and hung
// until the suite timed out. A telemetry buffer is not worth breaking the
// shutdown path; the graceful routes already flush through endSession().
try {
  process.on("exit", () => {
    try {
      flush();
    } catch {
      /* ignore */
    }
  });
} catch {
  /* ignore */
}
