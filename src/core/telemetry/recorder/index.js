

/**
 * @module core/telemetry/recorder
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
 *   - **Measured and estimated savings never merge.** Cache payloads, compression
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

export { RAW_RETENTION_DAYS } from "../store/index.js";
export * from "./_constants.js";
export * from "./_flags.js";
export * from "./_identity.js";
export * from "./_session.js";
export * from "./_buffer.js";
export * from "./_record.js";
