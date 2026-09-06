/** @module core/telemetry/flight/envelope */

import { homedir } from "node:os";
import { getProjectPaths } from "../../../cli/paths.js";
import { detectAgentUsage, unsupportedAgents } from "../../agents/transcripts/index.js";
import { snapshotProject } from "../../session/_snapshot.js";
import { computeKpi } from "../kpi/index.js";
import { readRollups, readSidecarUsage } from "../store/index.js";
import { FLIGHT_FILE_VERSION, SERVER_NAME } from "./_constants.js";
import { promptsOf } from "./_prompts.js";
import { summarizeSessions } from "./_sessions.js";
import { timelineOf } from "./_timeline.js";

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
