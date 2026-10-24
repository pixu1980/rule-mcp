/** @module core/telemetry/store/constants */

/** Raw events are kept this long, then dropped. Aggregates outlive them. */
export const RAW_RETENTION_DAYS = 7;

/** Hard ceiling on the raw log. Past this the oldest half goes, rollup or not. */
export const MAX_EVENTS_BYTES = 8 * 1024 * 1024;
