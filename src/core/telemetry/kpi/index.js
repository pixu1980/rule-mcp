

/**
 * @module core/telemetry/kpi
 *
 * The numbers a benchmark of this server is actually made of.
 *
 * Three sources meet here and are kept apart on purpose:
 *
 *   - **Measured by us**: how many bytes our own results took, what the cache
 *     replayed, what compression compressed, which guardrails failed.
 *   - **Measured by the agent**: the model's tokens and money, read from its
 *     transcript. Real figures, but not ours.
 *   - **Modeled**: what reading the whole skill file would have cost, and how
 *     many times a person had to ask again. Both are guesses, both are labeled.
 *
 * The one rule inherited from the telemetry design still holds and matters most
 * here, because this is where the headline numbers are made: the routing
 * estimate never merges into a measured total. It is the largest of the three
 * numbers, so merging it would be the most flattering and least defensible
 * thing this server could report.
 *
 * @see module:core/telemetry/stats - percentiles and rendering
 * @see module:core/agents/transcripts - where the model's usage comes from
 */

export * from "./_iterations.js";
export * from "./_compute.js";
