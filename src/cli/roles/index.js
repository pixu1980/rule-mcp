

/**
 * @module cli/roles
 *
 * `rule-mcp roles` - read the merged role catalog and manage the user's
 * own layer of it (personas B.5).
 *
 * Three layers answer "which role is this": the embedded catalog, the user's
 * overlay, the project's. Reading three directories to work out which one won
 * is the kind of question a CLI should answer in one line, so `list` prints the
 * merged view with the layer beside each entry.
 *
 * The write side exists because the alternative was a hand-written JSON file
 * whose first contact with the validator happened after it was already on disk
 * and already wrong. Overlays are written as persona files (markdown with
 * frontmatter and a lenses list in the body), the same format the loader reads. `new` and `deprecate` write through the same validator the
 * loader uses, and refuse rather than leave an invalid file behind. The embedded
 * catalog is never edited: deprecating a built-in role writes the user's own
 * copy of it, which is what the precedence rules were for.
 *
 * @see module:core/review/overlays - where the layers live
 */

export * from "./_store.js";
export * from "./_render.js";
export * from "./_command.js";
export * from "./_command-new.js";
export * from "./_command-deprecate.js";
