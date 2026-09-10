

/**
 * @module core/project-snapshot
 *
 * What the project looked like when the recording ended.
 *
 * Half of any honest benchmark of this server is not about the server at all:
 * it is about what came out the other end. Lines written, components created,
 * ADRs recorded, tests present, and how much of the repository is dependencies
 * rather than work. The hand-written reports gathered these with `find`, `wc`
 * and `du`; doing it here makes them part of the export instead of part of
 * somebody's afternoon.
 *
 * Everything is measured, nothing is scored. "Did the model follow the
 * styleguide" is a judgment and stays out; "how many directories have a barrel
 * file" is a count and stays in.
 *
 * @see module:core/telemetry/flight - what puts this in the export
 */

export * from "./_classify.js";
export * from "./_sizes.js";
export * from "./_project.js";
