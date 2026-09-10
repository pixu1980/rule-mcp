

/**
 * @module core/review/template
 *
 * One role becomes one prompt (personas plan A.3).
 *
 * The template is the user's own wording and is filled verbatim - the
 * placeholders are the only thing that changes. What the registry cannot say
 * is appended below it as the operation contract: which documents the run
 * produces, where they live, and how a re-run updates them.
 *
 * The output is byte-stable for a given role: every surface generates from
 * this function, so a snapshot test is enough to pin what four entry points
 * will say.
 */

export * from "./_operation.js";
export * from "./_fill.js";
