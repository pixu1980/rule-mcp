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

export * from "./_constants.js";
export * from "./_envelope.js";
export * from "./_redact.js";
export * from "./_retention.js";
export * from "./_export.js";
