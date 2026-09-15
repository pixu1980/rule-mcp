

/**
 * @module core/telemetry/store
 *
 * Where telemetry lives on disk, and how it stops growing.
 *
 * Append-only JSONL for raw events plus a rollup file of daily aggregates. Two
 * files and no database on purpose: SQLite would mean either a native
 * dependency, which this project does not take, or `node:sqlite`, which needs
 * Node 22 while `engines` still says 20.
 *
 * Both live in this project's own directory under the install,
 * `the projects root under the state dir`. Filed per project, because a
 * hit rate or a token saving averaged over every repository on a disk is a
 * number about the machine; the question anyone actually asks is what this
 * server did on THIS codebase. Kept out of the project, because nothing this
 * server records is something a repository should carry.
 *
 * Retention is the part that matters. Raw events carry per-call detail and are
 * purged after seven days; the daily aggregates they roll into are small enough
 * to keep forever. A size cap sits underneath both, because a machine that
 * never runs the rollup should still not fill up.
 *
 * Every function here is defensive to the point of silence: a telemetry writer
 * that throws would break the tool call it was only supposed to watch.
 *
 * @see module:core/telemetry - what gets recorded
 * @see module:cli/paths - where the project directory is
 */

export * from "./_constants.js";
export * from "./_paths.js";
export * from "./_sidecar.js";
export * from "./_events.js";
export * from "./_rollup.js";
export * from "./_retention.js";
