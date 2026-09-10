

/**
 * @module core/docs-numbering
 *
 * Repair the numbering of ADRs and handoffs after parallel branches merge.
 *
 * A feature branch allocates the next free number from what it can see, so two
 * branches off the same base both write `069-...`. Merging them produces a
 * duplicate that nothing catches: the number in a filename is an alias, and
 * two documents sharing one alias cannot be ordered or linked.
 *
 * The repair is deterministic and needs no model: order the documents by when
 * they were actually created (the first commit that added the file, falling
 * back to mtime for uncommitted ones), keep the earliest holder of a number,
 * and move the later ones to the next free slot - filename, header, and every
 * cross-reference that pointed at them.
 *
 * Planning and applying are separate on purpose: renaming files and rewriting
 * references across docs/ is not something a diagnostic does on its own.
 */

export * from "./_plan.js";
export * from "./_apply.js";
export * from "./_render.js";
export * from "./_orphans.js";
export * from "./_stale-commits.js";
export * from "./_rewrite-commits.js";
