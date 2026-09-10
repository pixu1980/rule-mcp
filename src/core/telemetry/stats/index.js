

/**
 * @module core/telemetry/stats
 *
 * Reading the telemetry back.
 *
 * One rule shapes the whole output: measured savings and estimated savings are
 * reported as separate numbers, and the estimate is always rendered with a
 * tilde. Cache payloads and caveman before-and-after are measured, byte for
 * byte. "What reading the whole skill file would have cost" is a model of a
 * thing that did not happen, and adding it to a measured total produces a
 * headline number nobody can defend.
 *
 * Every count here is a char/4 heuristic for tokens, which is why the tilde
 * belongs on the measured numbers too.
 *
 * @see module:core/telemetry/store - where the events come from
 */

export * from "./_percentile.js";
export * from "./_aggregate.js";
export * from "./_render-stats.js";
export * from "./_render-flight.js";
