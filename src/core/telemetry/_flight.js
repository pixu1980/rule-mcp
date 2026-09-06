/**
 * @module core/telemetry/flight
 *
 * Exports a recording as a single `.flight` file.
 *
 * AI Flight Recorder is an open-source DevTools for AI applications: a timeline
 * of a session that can be paused, replayed and handed to a colleague as one
 * file. Its event model already has first-class MCP events - `mcp-tool-call`,
 * `mcp-tool-result`, `mcp-server-connected` - which is exactly the shape this
 * server's telemetry has, so the timeline is a projection and not a translation.
 *
 * We take the format and not the SDK. The SDK exists to wrap a model client and
 * record what it does; this server never calls a model, and the agreed
 * telemetry design is zero-dependency. Emitting the file it reads gets the
 * DevTools timeline for free and adds nothing to install.
 *
 * Version 2 carries four blocks beside that timeline - `kpi`, `usage`,
 * `project`, `prompts` - because the timeline alone answered none of the
 * questions the two hand-written benchmark reports were built to answer. The
 * DevTools ignores keys it does not know, so the replay still works and the
 * numbers no longer have to be worked out by hand.
 *
 * An export is the archive, so the log is emptied once it has been written.
 * Two rules follow from that and are enforced by tests: nothing is drained
 * before the file exists on disk, and `keep` exists for the one case where
 * somebody is debugging the exporter itself.
 *
 * Inspired by https://github.com/AllThingsSmitty/ai-flight-recorder (MIT).
 *
 * @see module:core/telemetry/store - the JSONL this reads
 * @see module:core/kpi - the numbers in the kpi block
 */

import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { getProjectPaths } from "../../cli/paths.js";
import { hashValue } from "./_telemetry.js";
import { detectAgentUsage, unsupportedAgents } from "../agents/transcripts/index.js";
import { computeKpi } from "./_kpi.js";
import { snapshotProject } from "../session/_snapshot.js";
import { drain, readEvents, readRollups, readSidecarUsage } from "./_store.js";
import { resetProjectId } from "./_telemetry.js";

/** The `.flight` envelope version this writer produces. */
export const FLIGHT_FILE_VERSION = "2";

/** The server name recorded on every MCP event. */
const SERVER_NAME = "rule-mcp";

/**
 * Deterministic id from a session and an ordinal, so exporting the same log
 * twice produces the same ids. A random id would make every export a new diff.
 *
 * @param {string} session
 * @param {number} index
 * @param {string} suffix
 * @returns {string}
 */
function eventId(session, index, suffix) {
  return createHash("sha256").update(`${session}:${index}:${suffix}`).digest("hex").slice(0, 24);
}

/**
 * The per-session summary rows.
 *
 * A shared daemon gives every client its own session, so one recording window
 * routinely holds several. They are summarized rather than nested, because the
 * timeline already carries `sessionId` on every event.
 *
 * @param {object[]} events - time-ordered
 * @returns {object[]}
 */
function summarizeSessions(events) {
  const groups = new Map();

  for (const event of events) {
    const id = event.session ?? "unknown";
    const row = groups.get(id) ?? {
      id,
      transport: event.transport ?? "stdio",
      client: event.client,
      startedAt: event.ts,
      endedAt: event.ts,
      calls: 0,
    };
    row.startedAt = Math.min(row.startedAt, event.ts);
    row.endedAt = Math.max(row.endedAt, event.ts);
    row.calls += 1;
    row.client ??= event.client;
    groups.set(id, row);
  }

  return [...groups.values()].sort((a, b) => a.startedAt - b.startedAt);
}

/**
 * The timeline: a connect event, a call/result pair per recorded call, a
 * disconnect.
 *
 * Each pair shares a `toolCallId`, which is what lets the timeline draw a span
 * with a duration rather than two unrelated points.
 *
 * @param {object[]} events - time-ordered
 * @param {string} windowId
 * @returns {object[]}
 */
function timelineOf(events, windowId) {
  const startedAt = events[0].ts;
  const endedAt = events.at(-1).ts;
  const transport = events[0].transport ?? "stdio";

  const timeline = [
    {
      id: eventId(windowId, -1, "connected"),
      sessionId: events[0].session,
      type: "mcp-server-connected",
      timestamp: startedAt,
      serverName: SERVER_NAME,
      transport: ["stdio", "sse", "http"].includes(transport) ? transport : "stdio",
    },
  ];

  for (const [index, event] of events.entries()) {
    const toolCallId = eventId(windowId, index, "call");
    const savedTotal = Object.values(event.saved ?? {}).reduce((a, b) => a + (Number(b) || 0), 0);

    timeline.push({
      id: toolCallId,
      sessionId: event.session,
      type: "mcp-tool-call",
      timestamp: event.ts,
      serverName: SERVER_NAME,
      toolName: event.tool,
      toolCallId,
      // Still not the arguments: their size is recorded, their content is not.
      // The prompt is the one exception and it lives in its own block, so a
      // reader who does not want it can drop one key.
      input: {
        ...(!(event.promptLength === undefined) && { promptLength: event.promptLength }),
        ...(!(event.argsBytes === undefined) && { argsBytes: event.argsBytes }),
        ...(event.routedSkill && { routedSkill: event.routedSkill }),
        ...(event.mode && { mode: event.mode }),
        ...(event.resource && { resource: true }),
      },
    });

    timeline.push({
      id: eventId(windowId, index, "result"),
      sessionId: event.session,
      type: "mcp-tool-result",
      timestamp: event.ts + (Number(event.durationMs) || 0),
      serverName: SERVER_NAME,
      toolCallId,
      success: event.ok !== false,
      durationMs: Number(event.durationMs) || 0,
      output: {
        cacheHit: Boolean(event.cacheHit),
        ...(!(event.resultBytes === undefined) && { resultBytes: event.resultBytes }),
        ...(!(event.resultTokensEst === undefined) && { resultTokensEst: event.resultTokensEst }),
        ...(savedTotal > 0 && { tokensSaved: savedTotal }),
        ...(event.estimatedRouting && { tokensSavedEstimated: event.estimatedRouting }),
        ...(typeof event.guardrailFailures === "number" && { guardrailFailures: event.guardrailFailures }),
      },
      metadata: {
        savedBySource: event.saved ?? {},
        ...(event.guardrailRules && { guardrailRules: event.guardrailRules }),
        ...(!(event.coreTokens === undefined) && {
          postProcessing: { core: event.coreTokens, final: event.finalTokens },
        }),
      },
    });
  }

  timeline.push({
    id: eventId(windowId, events.length, "disconnected"),
    sessionId: events.at(-1).session,
    type: "mcp-server-disconnected",
    timestamp: endedAt,
    serverName: SERVER_NAME,
  });

  return timeline;
}

/**
 * The prompts, as their own block.
 *
 * Separate from the timeline for two reasons: a prompt is the only free text in
 * the file, so a reader who must not keep it can drop one key; and the shape a
 * benchmark wants is a numbered list of what was asked, not a field buried in
 * every call.
 *
 * @param {object[]} events - time-ordered
 * @returns {object[]}
 */
function promptsOf(events) {
  const seen = new Set();
  const prompts = [];

  for (const event of events) {
    if (event.promptLength === undefined) {
      continue;
    }

    const repeat = event.prompt !== undefined && seen.has(event.prompt);

    if (event.prompt !== undefined) {
      seen.add(event.prompt);
    }

    prompts.push({
      ts: event.ts,
      tool: event.tool,
      session: event.session,
      length: event.promptLength,
      ...(event.routedSkill && { routedSkill: event.routedSkill }),
      ...(!(event.prompt === undefined) && { text: event.prompt }),
      // A prompt sent twice is the loudest signal in the recording: the first
      // attempt produced nothing the user could use.
      ...(repeat && { repeat: true }),
    });
  }

  return prompts;
}

/**
 * Build the `.flight` envelope for a whole recording window.
 *
 * @param {object[]} events - one window, any number of sessions
 * @param {{ exportedAt?: number, label?: string, projectDir?: string, home?: string, usage?: object }} [options]
 * @returns {object} a FlightFile with the version 2 blocks
 */
export function toFlight(events, options = {}) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error("No events to export.");
  }

  const ordered = [...events].sort((a, b) => a.ts - b.ts);
  const projectDir = options.projectDir ?? getProjectPaths().projectDir;
  const windowId = ordered[0].project ?? ordered[0].session;
  const sessions = summarizeSessions(ordered);
  const client = sessions.find((session) => session.client)?.client;

  // Measured beats declared. A transcript is what the agent's own runtime wrote
  // down; a sidecar is what a model said about itself, and only one of those
  // two is evidence. The declaration fills the gap when there is no transcript
  // this server knows how to read.
  // Scoped to this recording window: a transcript directory holds every session
  // the agent ever ran here, and an unscoped read reports the repository's
  // lifetime totals against five tool calls.
  const measured = detectAgentUsage({
    projectDir,
    home: options.home ?? homedir(),
    client,
    since: ordered[0].ts,
    until: ordered.at(-1).ts,
  });
  const usage = options.usage ?? (measured ? { ...measured, source: "transcript" } : readSidecarUsage());
  const project = snapshotProject(projectDir);
  const kpi = computeKpi({ events: ordered, usage, project });

  return {
    version: FLIGHT_FILE_VERSION,
    exportedAt: options.exportedAt ?? Date.now(),
    server: SERVER_NAME,
    project: {
      // The directory itself is a path on somebody's disk; the snapshot is the
      // part that says anything.
      ...project,
      dir: projectDir,
      id: ordered[0].project,
    },
    kpi,
    // Absent, not zeroed, when no agent transcript could be read. A fabricated
    // zero in a benchmark is worse than a gap, because a zero gets averaged.
    ...(usage ? { usage } : { usage: undefined, usageUnavailable: unsupportedAgents() }),
    prompts: promptsOf(ordered),
    sessions,
    rollups: readRollups(),
    session: {
      id: windowId,
      label: options.label ?? `${SERVER_NAME} recording`,
      tags: [SERVER_NAME, ...new Set(sessions.map((session) => session.transport))],
      // The format refuses to export a session still recording, which is the
      // right rule: a half-written timeline replays as a truncated one.
      status: "ended",
      startedAt: ordered[0].ts,
      endedAt: ordered.at(-1).ts,
      events: timelineOf(ordered, windowId),
    },
  };
}

/**
 * Share-safe copy of a flight (hardening 2.1, findings F-P1/F-P3).
 *
 * A local export is complete on purpose - it is the user's recording of their
 * own machine. Sharing one is a different act: prompt text is potentially
 * personal data (and routinely the employer's problem statement), and an
 * absolute path names a person and their disk layout. Both leave; every
 * number stays, so a redacted flight is still comparable with a full one.
 *
 * @param {object} flight - a flight envelope from toFlight
 * @returns {object} a deep copy with text and paths removed
 */
export function redactFlight(flight) {
  const copy = structuredClone(flight);
  copy.redacted = true;

  if (copy.project?.dir) {
    copy.project.dir = basename(copy.project.dir);
  }

  if (Array.isArray(copy.prompts)) {
    for (const prompt of copy.prompts) {
      delete prompt.text;
    }
  }

  const scrubPath = (node) => {
    if (!node || typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        scrubPath(item);
      }

      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === "path" && typeof value === "string") {
        node[key] = hashValue(value);
      } else if (typeof value === "object") {
        scrubPath(value);
      }
    }
  };
  scrubPath(copy.session);
  scrubPath(copy.sessions);
  scrubPath(copy.rollups);

  return copy;
}

/** Exports kept regardless of age, and the age window kept regardless of count. */
const EXPORT_KEEP = 10;
const EXPORT_MAX_AGE_DAYS = 90;

/**
 * Apply retention to exports/ (hardening 2.2, finding F-P1).
 *
 * Raw events are purged after 7 days; an exported .flight carries the whole
 * recording - prompt text included - and had no expiry at all. The rule keeps
 * whichever is larger, the newest `keep` files or everything inside the age
 * window, and never removes the newest file: a policy that eats the export
 * somebody just made would be a bug.
 *
 * @param {{ dir?: string, projectDir?: string, keep?: number, maxAgeDays?: number, now?: number }} [options]
 * @returns {{ dir: string, removed: number, kept: number }}
 */
export function pruneExports(options = {}) {
  const dir = options.dir ?? getProjectPaths(options.projectDir ?? process.cwd()).exportsDir;
  const keep = options.keep ?? EXPORT_KEEP;
  const cutoff = (options.now ?? Date.now()) - (options.maxAgeDays ?? EXPORT_MAX_AGE_DAYS) * 86_400_000;

  let entries;
  try {
    entries = readdirSync(dir)
      .filter((name) => name.endsWith(".flight"))
      .map((name) => {
        const file = join(dir, name);

        return { file, mtime: statSync(file).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return { dir, removed: 0, kept: 0 };
  }

  let removed = 0;
  // Index 0 is the newest and is never a candidate, whatever the caps say.
  for (const [index, entry] of entries.entries()) {
    if (index === 0 || index < keep || entry.mtime >= cutoff) {
      continue;
    }

    try {
      rmSync(entry.file, { force: true });
      removed += 1;
    } catch {
      /* a file that cannot be removed stays, and the next run tries again */
    }
  }

  return { dir, removed, kept: entries.length - removed };
}

/**
 * Write the recording out as one file, then empty the log.
 *
 * @param {{
 *   projectDir?: string,
 *   home?: string,
 *   exportedAt?: number,
 *   label?: string,
 *   keep?: boolean,
 * }} [options]
 * @returns {{ file: string, flight: object, calls: number, drained: number }}
 */
export function exportFlight(options = {}) {
  const events = readEvents();

  if (events.length === 0) {
    throw new Error("Nothing recorded yet.");
  }

  const exportedAt = options.exportedAt ?? Date.now();
  const full = toFlight(events, { ...options, exportedAt });
  // Redaction is a share-time transform, not a record-time one: the local
  // recording stays complete, and only the copy meant to leave the machine
  // loses prompt text and absolute paths (hardening 2.1).
  const flight = options.redact ? redactFlight(full) : full;

  const { exportsDir } = getProjectPaths(options.projectDir ?? process.cwd());
  mkdirSync(exportsDir, { recursive: true });
  // Named by the moment it was taken, so exports sort chronologically in a
  // directory listing and two of them never collide.
  const stamp = new Date(exportedAt).toISOString().replaceAll(/[.:]/g, "-");
  const file = join(exportsDir, `${stamp}${options.redact ? ".redacted" : ""}.flight`);
  writeFileSync(file, JSON.stringify(flight, undefined, 2));

  // Only now, with the file on disk. Draining first would trade a recording for
  // a failed write.
  let drained = 0;

  if (!options.keep) {
    drained = drain().removed;
    // The id named the window that just closed, so the next call opens a new one.
    resetProjectId();
  }

  return { file, flight, calls: events.length, drained };
}
